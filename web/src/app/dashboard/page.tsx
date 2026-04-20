'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/context/WebSocketContext';
import { Transaction } from '@/types';
import MonthlyBarChart from '@/components/charts/BarChart';
import ExportButton from '@/components/ExportButton';
import { Wallet, TrendingUp, TrendingDown, Clock, ArrowRight, ArrowUpRight, ArrowDownRight, LayoutTemplate, PiggyBank, Target, Percent, Activity } from 'lucide-react';

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName?.toLowerCase() || '';
  if (name.includes('makan')) return <LayoutTemplate size={20} className="text-indigo-500" />;
  if (name.includes('transport')) return <LayoutTemplate size={20} className="text-indigo-500" />;
  // for now, use a generic corporate icon
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

interface ComparisonData {
  current: { income: { total: number }; expense: { total: number } };
  previous: { income: { total: number }; expense: { total: number } };
  expenseChange: number;
  incomeChange: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<{ income: { total: number }; expense: { total: number } } | null>(null);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { socket } = useWebSocket();

  const loadData = useCallback(async () => {
    try {
      const now = new Date();
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const endOfMonth = now.toISOString().split('T')[0];

      const [statsRes, transactionsRes, historyRes, comparisonRes] = await Promise.all([
        api.getStats(startOfMonth, endOfMonth),
        api.getTransactions({ limit: 5 }),
        api.getHistory(now.getFullYear()),
        api.getComparisonStats(),
      ]);

      setStats(statsRes.stats);
      setRecentTransactions(transactionsRes.transactions);
      setComparison(comparisonRes.comparison);

      // Process monthly data for bar chart (group by month, side-by-side income/expense)
      const monthMap: Record<string, { income: number; expense: number }> = {};
      historyRes.stats.forEach((item: any) => {
        const monthKey = new Date(item.month).toLocaleDateString('id-ID', { month: 'short' });
        if (!monthMap[monthKey]) monthMap[monthKey] = { income: 0, expense: 0 };
        monthMap[monthKey][item.type as 'income' | 'expense'] = parseFloat(item.total);
      });

      const chartData = Object.entries(monthMap).map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
      }));
      setMonthlyData(chartData);

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 5 seconds for near real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Listen for real-time transaction updates via WebSocket
  useEffect(() => {
    if (!socket) return;

    socket.on('transaction-created', (transaction) => {
      console.log('New transaction via WebSocket:', transaction);
      loadData(); // Refresh data immediately when new transaction comes in
    });

    return () => {
      socket.off('transaction-created');
    };
  }, [socket, loadData]);

  const totalIncome = stats?.income?.total || 0;
  const totalExpense = stats?.expense?.total || 0;
  const balance = totalIncome - totalExpense;
  
  // Calculate additional stats
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysLeft = daysInMonth - currentDay;
  const avgDailyExpense = currentDay > 0 ? Math.round(totalExpense / currentDay) : 0;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;
  const projectedExpense = avgDailyExpense * daysLeft;
  const projectedBalance = balance - projectedExpense;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Visual</h1>
          <p className="text-slate-500 text-sm mt-1">
            Ringkasan keuangan bulan ini •{' '}
            <span className="text-xs text-slate-400 font-medium">
              Update: {lastRefresh.toLocaleTimeString('id-ID')}
            </span>
          </p>
        </div>
        <ExportButton apiUrl={api.getApiUrl()} token={api.getToken()} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        {/* Income Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-500">Pemasukan</p>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp size={18} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatRupiah(totalIncome)}</p>
          {comparison && (
            <div className="flex items-center mt-3 text-xs font-medium">
              {comparison.incomeChange >= 0 ? (
                <span className="text-emerald-600 flex items-center bg-emerald-50 px-2 py-1 rounded-full">
                  <ArrowUpRight size={14} className="mr-1" /> {Math.abs(comparison.incomeChange)}%
                </span>
              ) : (
                <span className="text-red-500 flex items-center bg-red-50 px-2 py-1 rounded-full">
                  <ArrowDownRight size={14} className="mr-1" /> {Math.abs(comparison.incomeChange)}%
                </span>
              )}
              <span className="text-slate-400 ml-2">vs bulan lalu</span>
            </div>
          )}
        </div>

        {/* Expense Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-500">Pengeluaran</p>
            <div className="p-2 bg-rose-50 rounded-lg">
              <TrendingDown size={18} className="text-rose-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatRupiah(totalExpense)}</p>
          {comparison && (
            <div className="flex items-center mt-3 text-xs font-medium">
              {comparison.expenseChange <= 0 ? (
                <span className="text-emerald-600 flex items-center bg-emerald-50 px-2 py-1 rounded-full">
                  <ArrowDownRight size={14} className="mr-1" /> {Math.abs(comparison.expenseChange)}%
                </span>
              ) : (
                <span className="text-red-500 flex items-center bg-red-50 px-2 py-1 rounded-full">
                  <ArrowUpRight size={14} className="mr-1" /> {Math.abs(comparison.expenseChange)}%
                </span>
              )}
              <span className="text-slate-400 ml-2">vs bulan lalu</span>
            </div>
          )}
        </div>

        {/* Balance Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-500">Saldo Bersih</p>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Wallet size={18} className="text-indigo-600" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
            {formatRupiah(balance)}
          </p>
        </div>

        {/* Previous Month Card */}
        {comparison && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-500">Bulan Lalu</p>
              <div className="p-2 bg-slate-100 rounded-lg">
                <Clock size={18} className="text-slate-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatRupiah(comparison.previous.expense.total)}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-medium uppercase tracking-wider">Total Pengeluaran</p>
          </div>
        )}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-slate-400" />
            <p className="text-xs font-medium text-slate-500">Rata-rata Harian</p>
          </div>
          <p className="text-lg font-bold text-slate-900">{formatRupiah(avgDailyExpense)}</p>
          <p className="text-[10px] text-slate-400">pengeluaran per hari</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank size={16} className="text-slate-400" />
            <p className="text-xs font-medium text-slate-500">Tingkat Tabungan</p>
          </div>
          <p className={`text-lg font-bold ${savingsRate >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {savingsRate}%
          </p>
          <p className="text-[10px] text-slate-400">dari total income</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-slate-400" />
            <p className="text-xs font-medium text-slate-500">Sisa Hari</p>
          </div>
          <p className="text-lg font-bold text-slate-900">{daysLeft}</p>
          <p className="text-[10px] text-slate-400">hari di bulan ini</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-slate-400" />
            <p className="text-xs font-medium text-slate-500">Proyeksi Saldo</p>
          </div>
          <p className={`text-lg font-bold ${projectedBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatRupiah(projectedBalance)}
          </p>
          <p className="text-[10px] text-slate-400">estimasi bulanini</p>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <MonthlyBarChart data={monthlyData} title="Tren Pemasukan vs Pengeluaran" />
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-900">Transaksi Terbaru</h2>
          <a href="/dashboard/transactions" className="flex items-center text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Lihat semua <ArrowRight size={16} className="ml-1" />
          </a>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="text-slate-500 text-center py-8 text-sm">Belum ada transaksi</p>
        ) : (
          <div className="space-y-4">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 p-2 rounded-xl transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50/50 rounded-xl flex items-center justify-center border border-indigo-100/50">
                    {getCategoryIcon(tx.category_name)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 leading-tight">{tx.description || tx.category_name}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{tx.category_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatRupiah(Math.abs(tx.amount))}
                  </p>
                  <p className="text-sm font-medium text-slate-400 mt-0.5">
                    {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}