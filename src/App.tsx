/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  CalendarDays, 
  Settings 
} from 'lucide-react';
import { format } from 'date-fns';
import { db } from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from './lib/utils';

// Components
import CustomerList from './components/CustomerList';
import CustomerForm from './components/CustomerForm';
import DailyMarking from './components/DailyMarking';
import CustomerDetail from './components/CustomerDetail';
import SettingsView from './components/SettingsView';

type View = 'daily' | 'customers' | 'settings' | 'customer-detail' | 'add-customer' | 'edit-customer';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('daily');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const navigateToCustomer = (id: number) => {
    setSelectedCustomerId(id);
    setCurrentView('customer-detail');
  };

  const handleEditCustomer = () => {
    setCurrentView('edit-customer');
  };

  const renderView = () => {
    switch (currentView) {
      case 'daily':
        return <DailyMarking onSelectCustomer={navigateToCustomer} />;
      case 'customers':
        return (
          <CustomerList 
            onAddClick={() => {
              setSelectedCustomerId(null);
              setCurrentView('add-customer');
            }} 
            onSelectCustomer={navigateToCustomer}
          />
        );
      case 'add-customer':
        return (
          <CustomerForm 
            onBack={() => setCurrentView('customers')} 
            onSave={() => setCurrentView('customers')}
          />
        );
      case 'edit-customer':
        return selectedCustomerId ? (
          <CustomerForm 
            customerId={selectedCustomerId}
            onBack={() => setCurrentView('customer-detail')} 
            onSave={() => setCurrentView('customer-detail')}
          />
        ) : null;
      case 'customer-detail':
        return selectedCustomerId ? (
          <CustomerDetail 
            customerId={selectedCustomerId} 
            onBack={() => setCurrentView('customers')} 
            onEdit={handleEditCustomer} 
          />
        ) : null;
      case 'settings':
        return <SettingsView />;
      default:
        return <DailyMarking onSelectCustomer={navigateToCustomer} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black tracking-tight text-gray-900 uppercase">
            {currentView === 'daily' && 'Dashboard'}
            {currentView === 'customers' && 'Clients'}
            {currentView === 'add-customer' && 'New Client'}
            {currentView === 'edit-customer' && 'Update Info'}
            {currentView === 'customer-detail' && 'Profile'}
            {currentView === 'settings' && 'System'}
          </h1>
          <div className="text-[10px] font-black text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg tracking-widest uppercase shadow-sm">
            {format(new Date(), 'dd MMM')}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView + (selectedCustomerId || '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 px-6 py-4 flex justify-between items-center z-40">
        <NavButton 
          active={currentView === 'daily'} 
          onClick={() => setCurrentView('daily')}
          icon={<CalendarDays size={22} />}
          label="Today"
        />
        <NavButton 
          active={currentView === 'customers' || currentView === 'add-customer' || currentView === 'customer-detail' || currentView === 'edit-customer'} 
          onClick={() => setCurrentView('customers')}
          icon={<Users size={22} />}
          label="Clients"
        />
        <NavButton 
          active={currentView === 'settings'} 
          onClick={() => setCurrentView('settings')}
          icon={<Settings size={22} />}
          label="Ops"
        />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 transition-all outline-none",
        active ? "text-orange-600 scale-110" : "text-gray-400 hover:text-gray-500"
      )}
    >
      <div className={cn(
        "transition-all duration-300",
        active ? "text-orange-600" : ""
      )}>
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.15em]">{label}</span>
    </button>
  );
}


