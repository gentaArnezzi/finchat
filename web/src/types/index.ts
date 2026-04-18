export interface User {
  id: string;
  telegram_id: number;
  name: string;
  username?: string;
  timezone: string;
  currency: string;
  plan: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  user_id?: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  amount: number;
  budget_amount?: number;
  month: number;
  year: number;
}

export interface BudgetSpending {
  id: string;
  budget_id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  amount: number;
  budget_amount: number;
  month: number;
  year: number;
  spent: number;
  remaining: number;
  percent_used: number;
}

export interface Stats {
  income: { total: number; count: number };
  expense: { total: number; count: number };
}

export interface MonthlyStats {
  category: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  total: string;
  count: number;
}

export interface ParsedTransaction {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}