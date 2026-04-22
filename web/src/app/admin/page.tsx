'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '@/context/AdminContext';
import {
  Users, DollarSign, ReceiptText, Crown,
  ArrowUpRight, ArrowDownRight, Minus, BarChart3, RefreshCw
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface Stats {
  totalUsers: number;
  newUsersThisMonth: number;
  userGrowthPercent: number;
  totalRevenue: number;
  revenueThisMonth: number;
  totalTransactions: number;
  transactionsThisMonth: number;
  activeSubscribers: number;
  planDistribution: { plan: string; count: number }[];
}

interface ChartData {
  months: string[];
  userGrowth: number[];
  revenue: number[];
  transactions: number[];
}

// ============================================
// UTILS
// ============================================

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[parseInt(m) - 1]} '${y.slice(2)}`;
}

// ============================================
// COMPONENTS
// ============================================

function StatCard({ title, value, subtitle, icon: Icon, growth }: {
  title: string; value: string; subtitle: string; icon: any; growth?: number | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#a2c828' }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {growth !== undefined && growth !== null && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${growth > 0 ? 'text-emerald-600' : growth < 0 ? 'text-red-500' : 'text-slate-400'}`}>
          {growth > 0 ? <ArrowUpRight size={14} /> : growth < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
          {growth > 0 ? '+' : ''}{growth}% dari bulan lalu
        </div>
      )}
    </div>
  );
}

function MiniBarChart({ data, labels, color, formatter }: { data: number[]; labels: string[]; color: string; formatter: (n: number) => string }) {
  const max = Math.max(...data, 1);
  const recentData = data.slice(-12);
  const recentLabels = labels.slice(-12);
  return (
    <div className="mt-4">
      <div className="flex items-end gap-1 h-36">
        {recentData.map((val, i) => {
          const height = Math.max((val / max) * 100, 2);
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                {formatMonthLabel(recentLabels[i])}: {formatter(val)}
              </div>
              <div className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80" style={{ height: `${height}%`, backgroundColor: color, minHeight: '2px' }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1.5">
        {recentLabels.map((label, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-slate-400 truncate">
            {i % 3 === 0 || recentLabels.length <= 6 ? formatMonthLabel(label) : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanChart({ distribution }: { distribution: { plan: string; count: number }[] }) {
  const total = distribution.reduce((s, d) => s + d.count, 0) || 1;
  const colors: Record<string, string> = { free: '#94A3B8', pro: '#a2c828', business: '#7d9c1f' };

  return (
    <div className="space-y-3 mt-4">
      {distribution.map(d => (
        <div key={d.plan}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 font-medium capitalize">{d.plan || 'free'}</span>
            <span className="text-slate-400">{d.count} ({((d.count / total) * 100).toFixed(0)}%)</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${(d.count / total) * 100}%`, backgroundColor: colors[d.plan] || '#94A3B8' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// PAGE
// ============================================

export default function AdminDashboard() {
  const { adminFetch } = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, chartsRes] = await Promise.all([
        adminFetch<{ stats: Stats }>('/api/admin/stats'),
        adminFetch<{ charts: ChartData }>('/api/admin/charts'),
      ]);
      setStats(statsRes.stats);
      setCharts(chartsRes.charts);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#a2c828] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview performa FinChat</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={formatNumber(stats.totalUsers)} subtitle={`+${stats.newUsersThisMonth} bulan ini`} icon={Users} growth={stats.userGrowthPercent} />
          <StatCard title="Total Revenue" value={formatRupiah(stats.totalRevenue)} subtitle={`${formatRupiah(stats.revenueThisMonth)} bulan ini`} icon={DollarSign} />
          <StatCard title="Total Transaksi" value={formatNumber(stats.totalTransactions)} subtitle={`${formatNumber(stats.transactionsThisMonth)} bulan ini`} icon={ReceiptText} />
          <StatCard title="Active Subscribers" value={stats.activeSubscribers.toString()} subtitle="Paid plans aktif" icon={Crown} />
        </div>
      )}

      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2"><Users size={16} style={{ color: '#a2c828' }} /><h3 className="text-sm font-semibold text-slate-700">User Growth</h3></div>
            <p className="text-xs text-slate-400">New signups per bulan</p>
            <MiniBarChart data={charts.userGrowth} labels={charts.months} color="#a2c828" formatter={(n) => `${n} users`} />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2"><DollarSign size={16} style={{ color: '#a2c828' }} /><h3 className="text-sm font-semibold text-slate-700">Revenue</h3></div>
            <p className="text-xs text-slate-400">Paid revenue per bulan</p>
            <MiniBarChart data={charts.revenue} labels={charts.months} color="#a2c828" formatter={formatRupiah} />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2"><BarChart3 size={16} style={{ color: '#a2c828' }} /><h3 className="text-sm font-semibold text-slate-700">Transaksi</h3></div>
            <p className="text-xs text-slate-400">Total transactions per bulan</p>
            <MiniBarChart data={charts.transactions} labels={charts.months} color="#a2c828" formatter={(n) => `${formatNumber(n)} txn`} />
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Distribusi Plan</h3>
            <p className="text-xs text-slate-400">Breakdown user per plan</p>
            <PlanChart distribution={stats.planDistribution} />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Quick Stats</h3>
            <p className="text-xs text-slate-400">Ringkasan cepat</p>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Avg Transaksi/User', value: stats.totalUsers > 0 ? (stats.totalTransactions / stats.totalUsers).toFixed(1) : '0' },
                { label: 'Revenue/User (ARPU)', value: stats.totalUsers > 0 ? formatRupiah(stats.totalRevenue / stats.totalUsers) : formatRupiah(0) },
                { label: 'Conversion Rate', value: stats.totalUsers > 0 ? ((stats.activeSubscribers / stats.totalUsers) * 100).toFixed(1) + '%' : '0%' },
                { label: 'Transaksi Bulan Ini', value: formatNumber(stats.transactionsThisMonth) },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-b-0">
                  <span className="text-sm text-slate-500">{item.label}</span>
                  <span className="text-sm font-semibold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
