import React, { useState, useEffect } from 'react';
import { db, type Customer } from '../db';
import { cn } from '../lib/utils';
import { Save, ChevronLeft, User, Phone, MapPin, IndianRupee, FileText } from 'lucide-react';

interface Props {
  onBack: () => void;
  onSave: () => void;
  customerId?: number;
}

export default function CustomerForm({ onBack, onSave, customerId }: Props) {
  const [formData, setFormData] = useState<Omit<Customer, 'id' | 'createdAt'>>({
    name: '',
    phone: '',
    address: '',
    mealPreference: 'both',
    lunchPrice: 60,
    dinnerPrice: 60,
    notes: ''
  });

  useEffect(() => {
    if (customerId) {
      db.customers.get(customerId).then(customer => {
        if (customer) {
          const { id, createdAt, ...rest } = customer;
          setFormData(rest);
        }
      });
    }
  }, [customerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customerId) {
      await db.customers.update(customerId, formData);
    } else {
      await db.customers.add({
        ...formData,
        createdAt: Date.now()
      });
    }
    onSave();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-gray-900">
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium text-gray-500">Back to List</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <User size={12} /> Full Name
            </label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <Phone size={12} /> Phone Number
            </label>
            <input
              required
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
              placeholder="10 digit mobile"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <MapPin size={12} /> Delivery Address
            </label>
            <textarea
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none min-h-[80px]"
              placeholder="Flat no, Street, Landmark..."
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Meal Preference</label>
            <div className="grid grid-cols-3 gap-2">
              {(['lunch', 'dinner', 'both'] as const).map(pref => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => setFormData({ ...formData, mealPreference: pref })}
                  className={cn(
                    "py-3 text-xs font-bold rounded-xl border transition-all capitalize",
                    formData.mealPreference === pref 
                      ? "bg-orange-50 border-orange-200 text-orange-600" 
                      : "bg-white border-gray-100 text-gray-400"
                  )}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <IndianRupee size={12} /> Lunch Price
              </label>
              <input
                type="number"
                value={formData.lunchPrice}
                onChange={e => setFormData({ ...formData, lunchPrice: Number(e.target.value) })}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <IndianRupee size={12} /> Dinner Price
              </label>
              <input
                type="number"
                value={formData.dinnerPrice}
                onChange={e => setFormData({ ...formData, dinnerPrice: Number(e.target.value) })}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <IndianRupee size={12} /> Fixed Monthly Advance (Optional)
            </label>
            <input
              type="number"
              value={formData.advanceAmount || ''}
              onChange={e => setFormData({ ...formData, advanceAmount: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
              placeholder="e.g. 3000"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <FileText size={12} /> Private Notes
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
              placeholder="e.g. No spicy food, late dinner"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <Save size={20} />
          {customerId ? 'Update Customer' : 'Add Customer'}
        </button>
      </form>
    </div>
  );
}
