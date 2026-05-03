import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Attendance } from '../db';
import { format } from 'date-fns';
import { Check, X, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  onSelectCustomer: (id: number) => void;
}

export default function DailyMarking({ onSelectCustomer }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const customers = useLiveQuery(() => db.customers.toArray());
  const attendance = useLiveQuery(() => db.attendance.where('date').equals(today).toArray());

  const getAttendanceFor = (customerId: number) => {
    return attendance?.find(a => a.customerId === customerId);
  };

  const toggleMeal = async (customerId: number, meal: 'lunch' | 'dinner') => {
    const existing = await db.attendance
      .where('[customerId+date]')
      .equals([customerId, today])
      .first();

    if (existing) {
      await db.attendance.update(existing.id!, {
        [meal]: !existing[meal],
        updatedAt: Date.now()
      });
    } else {
      await db.attendance.add({
        customerId,
        date: today,
        lunch: meal === 'lunch',
        dinner: meal === 'dinner',
        extraLunch: 0,
        extraDinner: 0,
        updatedAt: Date.now()
      });
    }
  };

  const markAll = async (type: 'lunch' | 'dinner') => {
    if (!customers) return;
    
    for (const customer of customers) {
      if (customer.mealPreference === type || customer.mealPreference === 'both') {
        const existing = await db.attendance
          .where('[customerId+date]')
          .equals([customer.id!, today])
          .first();

        if (existing) {
          await db.attendance.update(existing.id!, { [type]: true, updatedAt: Date.now() });
        } else {
          await db.attendance.add({
            customerId: customer.id!,
            date: today,
            lunch: type === 'lunch',
            dinner: type === 'dinner',
            extraLunch: 0,
            extraDinner: 0,
            updatedAt: Date.now()
          });
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => markAll('lunch')}
          className="bg-orange-600 text-white p-4 rounded-2xl shadow-lg shadow-orange-100 flex flex-col items-center gap-2 active:scale-95 transition-all"
        >
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Check size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Mark All Lunch</span>
        </button>
        <button 
          onClick={() => markAll('dinner')}
          className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-100 flex flex-col items-center gap-2 active:scale-95 transition-all"
        >
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Check size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Mark All Dinner</span>
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">Recent Activity & Marking</h2>
        
        {customers?.map(customer => {
          const att = getAttendanceFor(customer.id!);
          const prefersLunch = customer.mealPreference === 'lunch' || customer.mealPreference === 'both';
          const prefersDinner = customer.mealPreference === 'dinner' || customer.mealPreference === 'both';

          return (
            <div key={customer.id} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => onSelectCustomer(customer.id!)}
                  className="flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">{customer.name}</h3>
                    <p className="text-[10px] text-gray-400 font-medium">Monthly billing active</p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  {prefersLunch && (
                    <button
                      onClick={() => toggleMeal(customer.id!, 'lunch')}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2",
                        att?.lunch 
                          ? "bg-orange-50 border-orange-200 text-orange-600" 
                          : "bg-white border-gray-50 text-gray-300"
                      )}
                    >
                      {att?.lunch ? <Check size={18} /> : <X size={18} />}
                    </button>
                  )}
                  {prefersDinner && (
                    <button
                      onClick={() => toggleMeal(customer.id!, 'dinner')}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2",
                        att?.dinner 
                          ? "bg-blue-50 border-blue-200 text-blue-600" 
                          : "bg-white border-gray-50 text-gray-300"
                      )}
                    >
                      {att?.dinner ? <Check size={18} /> : <X size={18} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {customers?.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">Add customers first to start daily marking.</p>
          </div>
        )}
      </div>
    </div>
  );
}
