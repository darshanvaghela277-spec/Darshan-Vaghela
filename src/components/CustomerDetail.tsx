import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Customer, type Attendance, type Payment } from '../db';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  subMonths, 
  addMonths,
  parseISO,
  isAfter,
  isBefore,
  startOfDay
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  IndianRupee, 
  Share2, 
  Plus, 
  Wallet,
  Trash2,
  Phone,
  MapPin,
  FileText,
  Calendar,
  MessageCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  customerId: number;
  onBack: () => void;
  onEdit: () => void;
}

export default function CustomerDetail({ customerId, onBack, onEdit }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'other'>('cash');

  const customer = useLiveQuery(() => db.customers.get(customerId));
  
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const attendance = useLiveQuery(() => 
    db.attendance
      .where('customerId').equals(customerId)
      .filter(a => isSameMonth(parseISO(a.date), selectedMonth))
      .toArray()
  , [customerId, selectedMonth]);

  const payments = useLiveQuery(() => 
    db.payments
      .where('customerId').equals(customerId)
      .toArray()
  , [customerId]);

  const stats = useMemo(() => {
    if (!attendance || !customer) return { lunchCount: 0, dinnerCount: 0, totalBill: 0 };
    
    let lunchCount = 0;
    let dinnerCount = 0;
    
    attendance.forEach(a => {
      if (a.lunch) lunchCount++;
      if (a.dinner) dinnerCount++;
      // Handle extra meals if needed, logic says "Total lunches taken x price"
      // I added extraLunch/extraDinner fields in Schema, so I'll include them if > 0
      lunchCount += (a.extraLunch || 0);
      dinnerCount += (a.extraDinner || 0);
    });

    const totalBill = (lunchCount * customer.lunchPrice) + (dinnerCount * customer.dinnerPrice);
    
    return { lunchCount, dinnerCount, totalBill };
  }, [attendance, customer]);

  const totalPaid = useMemo(() => {
    return payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  }, [payments]);

  // Overall balance would be total bill of ALL months minus total paid
  // But usually users want current month + previous pending.
  // Requirement: "Total bill, Total paid, Remaining balance"
  // Let's calculate total bill for ALL history to get true balance.
  const allTimeAttendance = useLiveQuery(() => 
    db.attendance.where('customerId').equals(customerId).toArray()
  , [customerId]);

  const grandTotalBill = useMemo(() => {
    if (!allTimeAttendance || !customer) return 0;
    let l = 0, d = 0;
    allTimeAttendance.forEach(a => {
      if (a.lunch) l += 1 + (a.extraLunch || 0);
      else l += (a.extraLunch || 0);
      
      if (a.dinner) d += 1 + (a.extraDinner || 0);
      else d += (a.extraDinner || 0);
    });
    return (l * customer.lunchPrice) + (d * customer.dinnerPrice);
  }, [allTimeAttendance, customer]);

  const currentBalance = grandTotalBill - totalPaid;

  const toggleMeal = async (dateStr: string, meal: 'lunch' | 'dinner') => {
    const existing = await db.attendance
      .where('[customerId+date]')
      .equals([customerId, dateStr])
      .first();

    if (existing) {
      await db.attendance.update(existing.id!, {
        [meal]: !existing[meal],
        updatedAt: Date.now()
      });
    } else {
      await db.attendance.add({
        customerId,
        date: dateStr,
        lunch: meal === 'lunch',
        dinner: meal === 'dinner',
        extraLunch: 0,
        extraDinner: 0,
        updatedAt: Date.now()
      });
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount) return;
    await db.payments.add({
      customerId,
      amount: Number(paymentAmount),
      date: format(new Date(), 'yyyy-MM-dd'),
      method: paymentMethod,
      createdAt: Date.now()
    });
    setPaymentAmount('');
    setShowPaymentModal(false);
  };

  const generateWhatsAppSummary = () => {
    if (!customer || !attendance) return;
    
    let text = `Customer Name: ${customer.name}\n\n`;
    
    daysInMonth.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const att = attendance.find(a => a.date === dateStr);
      if (att && (att.lunch || att.dinner)) {
        text += `${format(day, 'd MMM')} - Lunch ${att.lunch ? '✔' : '✘'} Dinner ${att.dinner ? '✔' : '✘'}\n`;
      }
    });

    text += `\nTotal Lunch: ${stats.lunchCount}`;
    text += `\nTotal Dinner: ${stats.dinnerCount}`;
    text += `\n\nLunch Total: ₹${stats.lunchCount * customer.lunchPrice}`;
    text += `\nDinner Total: ₹${stats.dinnerCount * customer.dinnerPrice}`;
    text += `\n\nGrand Total: ₹${stats.totalBill}`; // This is monthly
    text += `\nTotal Paid: ₹${totalPaid}`;
    text += `\nPending: ₹${currentBalance}`;

    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (!customer) return null;

  return (
    <div className="space-y-6 pb-32">
      {/* Header Info */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-gray-900">
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium text-gray-400">Back</span>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 flex gap-2">
          <button 
            onClick={onEdit} 
            className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
          >
            Edit
          </button>
          <button 
            onClick={async () => {
              if (confirm('Permanently delete this client and all records?')) {
                await db.transaction('rw', [db.customers, db.attendance, db.payments], async () => {
                  await db.attendance.where('customerId').equals(customerId).delete();
                  await db.payments.where('customerId').equals(customerId).delete();
                  await db.customers.delete(customerId);
                });
                onBack();
              }
            }} 
            className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1.5 rounded-lg"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 text-2xl font-black">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">{customer.name}</h2>
              <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <Phone size={10} /> {customer.phone}
              </p>
            </div>
          </div>
          
          <div className="flex gap-4 pt-2 border-t border-gray-50">
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Monthly Bill</p>
              <p className="text-lg font-black text-gray-900">₹{stats.totalBill}</p>
            </div>
            <div className="flex-1 border-l border-gray-50 pl-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Balance</p>
              <p className={cn("text-lg font-black", currentBalance > 0 ? "text-red-600" : "text-emerald-600")}>
                ₹{currentBalance}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm">
        <button 
          onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
          className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
           <span className="text-sm font-black uppercase tracking-widest">{format(selectedMonth, 'MMMM yyyy')}</span>
           <span className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">Select cycle</span>
        </div>
        <button 
          onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
          className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Attendance Grid */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Monthly Attendance</h3>
          <div className="flex gap-4">
             <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div><span className="text-[9px] font-bold text-gray-400 uppercase">L</span></div>
             <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-[9px] font-bold text-gray-400 uppercase">D</span></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
          {daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const att = attendance?.find(a => a.date === dateStr);
            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
            const isFuture = isAfter(day, startOfDay(new Date()));

            return (
              <div 
                key={dateStr} 
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all",
                  isToday ? "bg-orange-50 border-orange-100" : "bg-white border-transparent",
                  isFuture ? "opacity-30 pointer-events-none" : "opacity-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 text-[11px] font-bold text-gray-400 uppercase">
                    {format(day, 'dd')}<br/><small className="text-[8px] tracking-widest opacity-60">{format(day, 'EEE')}</small>
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => toggleMeal(dateStr, 'lunch')}
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center border transition-all",
                      att?.lunch ? "bg-orange-500 border-orange-400 text-white" : "bg-gray-50 border-gray-100 text-gray-300"
                    )}
                  >
                    <span className="text-[10px] font-black">{att?.lunch ? '✔' : 'L'}</span>
                  </button>
                  <button 
                    onClick={() => toggleMeal(dateStr, 'dinner')}
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center border transition-all",
                      att?.dinner ? "bg-blue-500 border-blue-400 text-white" : "bg-gray-50 border-gray-100 text-gray-300"
                    )}
                  >
                     <span className="text-[10px] font-black">{att?.dinner ? '✔' : 'D'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 mb-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4 px-2">Payment History</h3>
        <div className="space-y-2">
          {payments?.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5).map(payment => (
            <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                  <IndianRupee size={14} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-gray-900">₹{payment.amount}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">{payment.method} • {format(parseISO(payment.date), 'dd MMM')}</p>
                </div>
              </div>
              <button 
                onClick={async () => {
                  if (confirm('Delete this payment record?')) {
                    await db.payments.delete(payment.id!);
                  }
                }}
                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {(!payments || payments.length === 0) && (
            <p className="text-center py-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">No payments yet</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 fixed bottom-28 left-4 right-4 z-10 bg-white/40 backdrop-blur-md p-2 rounded-[2rem]">
        {customer.advanceAmount ? (
          <button 
            onClick={async () => {
              if (confirm(`Record fixed advance of ₹${customer.advanceAmount}?`)) {
                await db.payments.add({
                  customerId,
                  amount: customer.advanceAmount!,
                  date: format(new Date(), 'yyyy-MM-dd'),
                  method: 'cash',
                  createdAt: Date.now()
                });
              }
            }}
            className="col-span-2 bg-orange-100 text-orange-600 font-black py-4 rounded-2xl border border-orange-200 flex items-center justify-center gap-2 active:scale-95 transition-all text-sm uppercase tracking-wider mb-2"
          >
            <Check size={18} /> Pay ₹{customer.advanceAmount} Advance
          </button>
        ) : null}
        <button 
          onClick={() => setShowPaymentModal(true)}
          className="bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95 transition-all text-sm uppercase tracking-wider"
        >
          <Wallet size={18} /> Add Payment
        </button>
        <button 
          onClick={generateWhatsAppSummary}
          className="bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-100 flex items-center justify-center gap-2 active:scale-95 transition-all text-sm uppercase tracking-wider"
        >
          <MessageCircle size={18} /> Send Bill
        </button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-6 shadow-2xl"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-400">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Amount Received</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <IndianRupee size={16} />
                  </div>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl pl-11 pr-4 py-4 text-xl font-black focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'upi', 'other'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={cn(
                        "py-3 rounded-xl border text-xs font-black uppercase transition-all",
                        paymentMethod === m ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-gray-100 text-gray-400"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAddPayment}
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-200 active:scale-95 transition-all outline-none"
              >
                Record Now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
