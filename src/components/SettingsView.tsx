import React, { useRef } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Download, 
  Upload, 
  Trash2, 
  Database, 
  Users, 
  TrendingUp, 
  CircleAlert,
  Save,
  HardDrive
} from 'lucide-react';
import { format } from 'date-fns';

export default function SettingsView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const customerCount = useLiveQuery(() => db.customers.count()) || 0;
  const paymentCount = useLiveQuery(() => db.payments.count()) || 0;
  const attendanceCount = useLiveQuery(() => db.attendance.count()) || 0;

  const handleExport = async () => {
    const customers = await db.customers.toArray();
    const attendance = await db.attendance.toArray();
    const payments = await db.payments.toArray();

    const backupData = {
      version: 1,
      timestamp: Date.now(),
      data: {
        customers,
        attendance,
        payments
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tiffin-manager-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (!backup.data || !backup.data.customers) throw new Error('Invalid backup file');

        if (confirm('This will append data to your existing database. Continue?')) {
          // Clear current or merge? merge is safer for "backup"
          // For simplicity, let's just add items. IDs might conflict if they were original.
          // Better logic: clear and replace if user confirms full restore.
          if (confirm('Do you want to REPLACE all current data? (Cancel to just add/merge)')) {
            await db.transaction('rw', [db.customers, db.attendance, db.payments], async () => {
              await db.customers.clear();
              await db.attendance.clear();
              await db.payments.clear();
              
              await db.customers.bulkAdd(backup.data.customers);
              await db.attendance.bulkAdd(backup.data.attendance);
              await db.payments.bulkAdd(backup.data.payments);
            });
          } else {
            // Merge logic (without ID conflict)
            const { customers, attendance, payments } = backup.data;
            // Remove IDs for bulkAdd to generate new ones
            const stripId = (items: any[]) => items.map(({ id, ...rest }: any) => rest);
            await db.customers.bulkAdd(stripId(customers));
            await db.attendance.bulkAdd(stripId(attendance));
            await db.payments.bulkAdd(stripId(payments));
          }
          alert('Import successful!');
          window.location.reload();
        }
      } catch (err) {
        alert('Error importing data: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Customers</p>
            <p className="text-2xl font-black text-gray-900">{customerCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payments</p>
            <p className="text-2xl font-black text-gray-900">{paymentCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Database & Backup</h3>
          <p className="text-xs text-gray-400 font-medium">Manage your offline data storage.</p>
        </div>

        <div className="space-y-3">
          <button 
            onClick={handleExport}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-orange-200 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                <Download size={16} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">Export Backup</p>
                <p className="text-[10px] text-gray-400 font-medium">Download as JSON file</p>
              </div>
            </div>
            <Save size={16} className="text-gray-300" />
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-200 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <Upload size={16} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">Restore Data</p>
                <p className="text-[10px] text-gray-400 font-medium">Upload from JSON backup</p>
              </div>
            </div>
            <HardDrive size={16} className="text-gray-300" />
          </button>

          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            accept=".json"
            onChange={handleImport}
          />
        </div>

        <div className="pt-4 border-t border-gray-50">
          <button 
            onClick={async () => {
              if (confirm('ARE YOU SURE? This will permanently delete ALL data.')) {
                await db.delete();
                window.location.reload();
              }
            }}
            className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 rounded-2xl transition-colors"
          >
            <Trash2 size={18} />
            <span className="text-sm font-bold">Clear All Data Permanently</span>
          </button>
        </div>
      </div>

      <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 space-y-4">
        <div className="flex gap-3">
          <CircleAlert className="text-orange-600 shrink-0" size={20} />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-orange-900">Offline App Notice</h4>
            <p className="text-xs text-orange-800/70 leading-relaxed font-medium">
              All data is stored locally in your browser's memory. If you clear your browser cache or change devices, your data will be lost. Please export backups regularly.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center py-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Tiffin Manager v1.0.0</p>
      </div>
    </div>
  );
}
