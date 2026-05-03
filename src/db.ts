import Dexie, { type EntityTable } from 'dexie';

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  address: string;
  mealPreference: 'both' | 'lunch' | 'dinner';
  lunchPrice: number;
  dinnerPrice: number;
  advanceAmount?: number;
  notes?: string;
  createdAt: number;
}

export interface Attendance {
  id?: number;
  customerId: number;
  date: string; // YYYY-MM-DD
  lunch: boolean;
  dinner: boolean;
  extraLunch: number;
  extraDinner: number;
  updatedAt: number;
}

export interface Payment {
  id?: number;
  customerId: number;
  amount: number;
  date: string; // YYYY-MM-DD
  method: 'cash' | 'upi' | 'other';
  notes?: string;
  createdAt: number;
}

export class TiffinDB extends Dexie {
  customers!: EntityTable<Customer, 'id'>;
  attendance!: EntityTable<Attendance, 'id'>;
  payments!: EntityTable<Payment, 'id'>;

  constructor() {
    super('TiffinDB');
    this.version(1).stores({
      customers: '++id, name, phone',
      attendance: '++id, [customerId+date], customerId, date',
      payments: '++id, customerId, date'
    });
  }
}

export const db = new TiffinDB();
