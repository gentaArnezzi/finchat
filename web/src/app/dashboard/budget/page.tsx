'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BudgetSpending, Category } from '@/types';
import { Plus, Wallet, Target, LayoutTemplate, Lock } from 'lucide-react';
import Link from 'next/link';

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName?.toLowerCase() || '';
  if (name.includes('makan')) return <LayoutTemplate size={20} className="text-indigo-500" />;
  if (name.includes('transport')) return <LayoutTemplate size={20} className="text-indigo-500" />;
  return <Wallet size={20} className="text-slate-400" />;
};

const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export default function BudgetPage() {
  const [spending, setSpending] = useState<BudgetSpending[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [newBudget, setNewBudget] = useState({ category_id: '', amount: '' });
  const [hasBudgetAccess, setHasBudgetAccess] = useState<boolean | null>(null);

  useEffect(() => {
    loadData();
    checkBudgetAccess();
  }, [selectedMonth, selectedYear]);

  const checkBudgetAccess = async () => {
    try {
      const res = await api.checkFeature('budget_alerts');
      setHasBudgetAccess(res.hasAccess);
    } catch {
      setHasBudgetAccess(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [spendingRes, categoriesRes] = await Promise.all([
        api.getBudgetSpending(selectedMonth, selectedYear),
        api.getCategories()
      ]);
      setSpending(spendingRes.spending);
      setCategories(categoriesRes.categories);
    } catch (error) {
      console.error('Failed to load budget:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async () => {
    if (!newBudget.category_id || !newBudget.amount) return;
    try {
      await api.createBudget({
        category_id: newBudget.category_id,
        amount: parseFloat(newBudget.amount),
        month: selectedMonth,
        year: selectedYear
      });
      setShowModal(false);
      setNewBudget({ category_id: '', amount: '' });
      loadData();
    } catch (error: any) {
      if (error.message?.includes('Budget')) {
        alert(error.message);
      } else {
        alert('Gagal membuat budget');
      }
    }
  };

  const getStatusColor = (percent: number) => {
    if (percent < 70) return 'bg-emerald-500';
    if (percent < 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = (percent: number) => {
    if (percent < 70) return 'Aman';
    if (percent < 90) return 'Hati-hati';
    return 'Over budget';
  };

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const totalBudget = spending.reduce((sum, s) => sum + s.budget_amount, 0);
  const totalSpent = spending.reduce((sum, s) => sum + s.spent, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Budget Bulanan</h1>
          <p className="text-slate-500 mt-1">Kelola target anggaran per kategori</p>
        </div>

        <div className="flex gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-sm font-medium"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>
                {new Date(2000, m - 1).toLocaleDateString('id-ID', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-sm font-medium"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {hasBudgetAccess === false ? (
            <Link
              href="/dashboard/upgrade"
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-500 rounded-xl hover:bg-slate-300 transition-colors font-medium text-sm"
            >
              <Lock size={16} /> Tambah Budget <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">PRO</span>
            </Link>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus size={16} /> Tambah Budget
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
          <p className="text-sm font-semibold text-slate-500 mb-2">Total Budget</p>
          <p className="text-2xl font-bold text-slate-900">{formatRupiah(totalBudget)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
          <p className="text-sm font-semibold text-slate-500 mb-2">Terpakai</p>
          <p className="text-2xl font-bold text-indigo-600">{formatRupiah(totalSpent)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
          <p className="text-sm font-semibold text-slate-500 mb-2">Sisa Keseluruhan</p>
          <p className="text-2xl font-bold text-emerald-600">{formatRupiah(totalBudget - totalSpent)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {spending.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
              <Target size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-900 font-medium mb-1">Belum ada budget untuk bulan ini</p>
            <p className="text-slate-500 text-sm mb-6">Mulai rencanakan anggaran pengeluaran Anda</p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
            >
              <Plus size={18} /> Buat Budget Pertama
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {spending.map((item) => {
              const percent = item.percent_used || 0;
              const remaining = item.remaining || 0;
              
              return (
                <div key={item.budget_id} className="p-6 transition-colors hover:bg-slate-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50/50 rounded-xl flex items-center justify-center border border-indigo-100/50">
                        {getCategoryIcon(item.category_name)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{item.category_name}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{monthName}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className={`px-2.5 py-1 text-xs rounded-md font-medium border ${percent >= 100 ? 'bg-red-50 text-red-700 border-red-100' : percent >= 80 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                        {getStatusText(percent)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2 font-medium">
                      <span className="text-slate-600">Terpakai: {formatRupiah(item.spent)}</span>
                      <span className="text-slate-900">Target: {formatRupiah(item.budget_amount)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${getStatusColor(percent)}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2.5 text-sm font-medium">
                      <span className={remaining < 0 ? 'text-red-500 font-semibold' : 'text-emerald-600'}>
                        {remaining < 0 ? 'Over: ' : 'Sisa: '}{formatRupiah(Math.abs(remaining))}
                      </span>
                      <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-xs">{percent.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Target size={20} className="text-indigo-600" /> Tambah Budget
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategori</label>
                <select
                  value={newBudget.category_id}
                  onChange={(e) => setNewBudget({ ...newBudget, category_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-shadow bg-white"
                >
                  <option value="">Pilih kategori</option>
                  {categories.filter(c => c.is_default || c.user_id).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Jumlah Target (IDR)</label>
                <input
                  type="number"
                  value={newBudget.amount}
                  onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                  placeholder="Contoh: 500000"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-shadow"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCreateBudget}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors shadow-sm shadow-indigo-200"
              >
                Simpan Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}