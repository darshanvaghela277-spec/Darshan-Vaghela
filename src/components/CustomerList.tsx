import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Search, Plus, User, Phone, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onAddClick: () => void;
  onSelectCustomer: (id: number) => void;
}

export default function CustomerList({ onAddClick, onSelectCustomer }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const customers = useLiveQuery(() => 
    db.customers
      .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .toArray()
  , [searchQuery]);

  const handleTouchStart = (id: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDeletingId(id);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      timerRef.current = null;
    }, 1000); 
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const confirmDelete = async (id: number) => {
    // Only use confirm once to avoid double confirmation annoyance
    if (confirm('Permanently delete client and all records?')) {
      try {
        await db.transaction('rw', [db.customers, db.attendance, db.payments], async () => {
          await db.attendance.where('customerId').equals(id).delete();
          await db.payments.where('customerId').equals(id).delete();
          await db.customers.delete(id);
        });
        setDeletingId(null);
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to delete client');
      }
    } else {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Search by name..."
          className="w-full bg-white border border-gray-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm shadow-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {customers?.map((customer) => (
          <div key={customer.id} className="relative">
            <motion.button
              onPointerDown={() => handleTouchStart(customer.id!)}
              onPointerUp={handleTouchEnd}
              onPointerLeave={handleTouchEnd}
              onContextMenu={(e) => e.preventDefault()}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (!deletingId) onSelectCustomer(customer.id!);
              }}
              className={cn(
                "w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-orange-200 transition-all",
                deletingId === customer.id ? "bg-red-50 border-red-200 scale-[0.98]" : ""
              )}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-lg">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{customer.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                    <Phone size={10} />
                    <span>{customer.phone}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "px-2 py-1 rounded text-[10px] font-black uppercase tracking-tight",
                  customer.mealPreference === 'both' ? "bg-purple-50 text-purple-600" :
                  customer.mealPreference === 'lunch' ? "bg-orange-50 text-orange-600" :
                  "bg-blue-50 text-blue-600"
                )}>
                  {customer.mealPreference}
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </motion.button>

            <AnimatePresence>
              {deletingId === customer.id && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 bg-red-600/90 backdrop-blur-sm rounded-2xl flex items-center justify-between px-6 z-10"
                >
                  <span className="text-white font-black uppercase tracking-widest text-xs">Delete Client?</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(null);
                      }}
                      className="px-4 py-2 bg-white/20 text-white rounded-xl text-[10px] font-black uppercase"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(customer.id!);
                      }}
                      className="px-4 py-2 bg-white text-red-600 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-900/20"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {customers?.length === 0 && searchQuery && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No customers found matching "{searchQuery}"</p>
          </div>
        )}

        {customers?.length === 0 && !searchQuery && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-300">
              <User size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900">Your list is empty</h3>
              <p className="text-gray-400 text-xs">Add your first customer to get started!</p>
            </div>
            <button
              onClick={onAddClick}
              className="px-6 py-2.5 bg-orange-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-100"
            >
              Add Customer
            </button>
          </div>
        )}
      </div>

      {customers && customers.length > 0 && (
        <button
          onClick={onAddClick}
          className="fixed bottom-24 right-4 w-12 h-12 bg-orange-600 text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform z-10"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
