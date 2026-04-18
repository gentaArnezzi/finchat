'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MonthlyStats } from '@/types';
import DonutChart from '@/components/charts/DonutChart';
import TrendLineChart from '@/components/charts/LineChart';
import MonthlyBarChart from '@/components/charts/BarChart';
import { Wallet, LayoutTemplate, ArrowUpRight, ArrowDownRight, Scale } from 'lucide-react';

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName?.toLowerCase() || '';
  if (name.includes('makan')) return <LayoutTemplate size={16} className="text-indigo-500" />;
  if (name.includes('transport')) return <LayoutTemplate size={16} className="text-indigo-500" />;
  return <Wallet size={16} className="text-slate-400" />;
};

const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export default function AnalyticsPage() {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [historyStats, setHistoryStats] = useState<any[]>([]);
  const [prevStats, setPrevStats] = useState<{expense: number, income: number} | null>(null);
  const [topTransactions, setTopTransactions] = useState<any[]>([]);
  const [dailyTrend, setDailyTrend] = useState<{ date: string; income: number; expense: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
      const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

      const firstDay = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
      const [monthlyRes, prevMonthlyRes, historyRes, trendRes, txRes] = await Promise.all([
        api.getMonthlyStats(selectedYear, selectedMonth),
        api.getMonthlyStats(prevYear, prevMonth),
        api.getHistory(selectedYear),
        api.getDailyTrend(30),
        api.getTransactions({ startDate: firstDay, endDate: lastDay, type: 'expense', limit: 200 })
      ]);
      setMonthlyStats(monthlyRes.stats);
      setHistoryStats(historyRes.stats);
      
      const pExpense = prevMonthlyRes.stats.filter((s: any) => s.type === 'expense').reduce((sum: number, s: any) => sum + Number(s.total), 0);
      const pIncome = prevMonthlyRes.stats.filter((s: any) => s.type === 'income').reduce((sum: number, s: any) => sum + Number(s.total), 0);
      setPrevStats({ expense: pExpense, income: pIncome });

      if (txRes.transactions) {
        setTopTransactions(txRes.transactions.sort((a: any, b: any) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 5));
      }

      // Process daily trend data
      const trendMap: Record<string, { income: number; expense: number }> = {};
      trendRes.trend.forEach((item: any) => {
        const dateKey = item.date.split('T')[0];
        if (!trendMap[dateKey]) trendMap[dateKey] = { income: 0, expense: 0 };
        trendMap[dateKey][item.type as 'income' | 'expense'] = parseFloat(item.total);
      });
      const trendData = Object.entries(trendMap).map(([date, data]) => ({
        date,
        income: data.income,
        expense: data.expense,
      }));
      setDailyTrend(trendData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const expenseByCategory = monthlyStats.filter(s => s.type === 'expense');
  const incomeByCategory = monthlyStats.filter(s => s.type === 'income');
  const totalExpense = expenseByCategory.reduce((sum, s) => sum + Number(s.total), 0);
  const totalIncome = incomeByCategory.reduce((sum, s) => sum + Number(s.total), 0);

  // Process monthly history for bar chart
  const monthMap: Record<string, { income: number; expense: number }> = {};
  historyStats.forEach((item: any) => {
    const monthKey = new Date(item.month).toLocaleDateString('id-ID', { month: 'short' });
    if (!monthMap[monthKey]) monthMap[monthKey] = { income: 0, expense: 0 };
    monthMap[monthKey][item.type as 'income' | 'expense'] = parseFloat(item.total);
  });
  const barChartData = Object.entries(monthMap).map(([month, data]) => ({
    month,
    income: data.income,
    expense: data.expense,
  }));

  const renderMoM = (current: number, prev: number | undefined, inverse: boolean = false) => {
    if (prev === undefined || prev === 0) return null;
    const diff = current - prev;
    const percent = Math.abs(diff / prev * 100).toFixed(1);
    
    let isGood = diff >= 0;
    if (inverse) isGood = !isGood; 
    
    const color = isGood ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-red-700 bg-red-50 border border-red-100';
    const icon = diff >= 0 ? '▲' : '▼';
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${color}`}>
        {icon} {percent}%
      </span>
    );
  };

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analisis Keuangan</h1>
          <p className="text-slate-500 mt-1">Visualisasi dan insight performa keuangan</p>
        </div>

        <div className="flex gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white shadow-sm"
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
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white shadow-sm"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-slate-500">Total Pengeluaran</p>
            <div className="p-2 bg-red-50 rounded-lg">
              <ArrowDownRight size={18} className="text-red-500" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{formatRupiah(totalExpense)}</p>
          <div className="flex items-center gap-2 mt-3">
            {renderMoM(totalExpense, prevStats?.expense, true)}
            <p className="text-xs font-medium text-slate-400">vs bln lalu</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-slate-500">Total Pemasukan</p>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <ArrowUpRight size={18} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{formatRupiah(totalIncome)}</p>
          <div className="flex items-center gap-2 mt-3">
            {renderMoM(totalIncome, prevStats?.income, false)}
            <p className="text-xs font-medium text-slate-400">vs bln lalu</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-slate-500">Saldo Netto</p>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Scale size={18} className="text-indigo-600" />
            </div>
          </div>
          <p className={`text-3xl font-extrabold ${totalIncome - totalExpense >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
            {formatRupiah(totalIncome - totalExpense)}
          </p>
          <div className="flex items-center gap-2 mt-3">
            {renderMoM(totalIncome - totalExpense, (prevStats?.income || 0) - (prevStats?.expense || 0), false)}
            <p className="text-xs font-medium text-slate-400">vs bln lalu</p>
          </div>
        </div>
      </div>

      {/* Donut Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <DonutChart
            title={`Pengeluaran per Kategori - ${monthName}`}
            data={expenseByCategory.map(cat => ({
              name: cat.category,
              value: Number(cat.total),
              icon: '', // removing emojis from charts
              color: cat.color,
            }))}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <DonutChart
            title={`Pemasukan per Kategori - ${monthName}`}
            data={incomeByCategory.map(cat => ({
              name: cat.category,
              value: Number(cat.total),
              icon: '', // removing emojis from charts
              color: cat.color,
            }))}
          />
        </div>
      </div>

      {/* Daily Trend Line Chart */}
      {dailyTrend.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <TrendLineChart data={dailyTrend} title="Tren Harian (30 Hari Terakhir)" />
        </div>
      )}

      {/* Monthly Bar Chart */}
      {barChartData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <MonthlyBarChart data={barChartData} title={`Tren Bulanan ${selectedYear}`} />
        </div>
      )}

      {/* Top 5 Transactions */}
      {topTransactions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 overflow-hidden">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Top 5 Transaksi Terbesar (Pengeluaran)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Tanggal</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Deskripsi</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Kategori</th>
                  <th className="text-right py-4 px-6 font-semibold text-slate-900">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 whitespace-nowrap text-slate-600">
                      {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 text-slate-900 font-medium">{tx.description || '-'}</td>
                    <td className="py-4 px-6 font-medium text-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100/50">
                          {getCategoryIcon(tx.category_name)}
                        </div>
                        {tx.category_name}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-red-600">
                      -{formatRupiah(Math.abs(tx.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Detail Table */}
      {expenseByCategory.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 overflow-hidden">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Detail Kategori Pengeluaran</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Kategori</th>
                  <th className="text-right py-4 px-6 font-semibold text-slate-900">Jumlah</th>
                  <th className="text-right py-4 px-6 font-semibold text-slate-900">Transaksi</th>
                  <th className="text-right py-4 px-6 font-semibold text-slate-900">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenseByCategory.map((cat, i) => {
                  const percent = totalExpense > 0 ? (Number(cat.total) / totalExpense * 100) : 0;
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-700 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100/50">
                          {getCategoryIcon(cat.category)}
                        </div>
                        {cat.category}
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-slate-900">
                        {formatRupiah(Number(cat.total))}
                      </td>
                      <td className="py-4 px-6 text-right text-slate-600">{cat.count}x</td>
                      <td className="py-4 px-6 text-right font-medium text-indigo-600 bg-indigo-50/30">{percent.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}