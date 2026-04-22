'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, DollarSign, ReceiptText, Crown, TrendingUp, TrendingDown,
  Search, ChevronLeft, ChevronRight, LogOut, Shield, Eye, EyeOff,
  BarChart3, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

interface UserRow {
  id: string;
  telegram_id: string;
  name: string;
  username: string;
  plan: string;
  created_at: string;
  updated_at: string;
  transaction_count: number;
  last_transaction_at: string | null;
}

interface PaymentRow {
  id: string;
  user_id: string;
  order_id: string;
  plan: string;
  amount: number;
  payment_method: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  user_name: string;
  user_username: string;
}

interface ChartData {
  months: string[];
  userGrowth: number[];
  revenue: number[];
  transactions: number[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================
// API HELPERS
// ============================================

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('finchat_admin_secret');
}

function setAdminToken(token: string) {
  localStorage.setItem('finchat_admin_secret', token);
}

function clearAdminToken() {
  localStorage.removeItem('finchat_admin_secret');
}

async function adminFetch<T>(endpoint: string): Promise<T> {
  const secret = getAdminToken();
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
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

function formatDate(s: string | null): string {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(s: string | null): string {
  if (!s) return '-';
  return new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}

function planBadge(plan: string) {
  const styles: Record<string, string> = {
    free: 'bg-slate-100 text-slate-600',
    pro: 'bg-amber-100 text-amber-700',
    business: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[plan] || styles.free}`}>
      {plan || 'free'}
    </span>
  );
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

// ============================================
// MINI BAR CHART (pure CSS)
// ============================================

function MiniBarChart({ data, labels, color, formatter }: { data: number[]; labels: string[]; color: string; formatter: (n: number) => string }) {
  const max = Math.max(...data, 1);
  const recentData = data.slice(-12);
  const recentLabels = labels.slice(-12);

  return (
    <div className="mt-4">
      <div className="flex items-end gap-1 h-32">
        {recentData.map((val, i) => {
          const height = Math.max((val / max) * 100, 2);
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div
                className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none"
              >
                {formatMonthLabel(recentLabels[i])}: {formatter(val)}
              </div>
              <div
                className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80"
                style={{ height: `${height}%`, backgroundColor: color, minHeight: '2px' }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {recentLabels.map((label, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-slate-400 truncate">
            {i % 2 === 0 || recentLabels.length <= 6 ? formatMonthLabel(label) : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// LOGIN SCREEN
// ============================================

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true);
    setError('');

    try {
      setAdminToken(secret.trim());
      await adminFetch('/api/admin/stats');
      onLogin();
    } catch {
      clearAdminToken();
      setError('Secret key invalid atau server tidak merespons');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/30" style={{background: 'linear-gradient(135deg, #a2c828, #7d9c1f)'}}>
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">FinChat Admin</h1>
          <p className="text-slate-400 mt-1 text-sm">Masukkan admin secret key</p>
        </div>

        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Admin Secret</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Masukkan ADMIN_SECRET dari .env"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#a2c828] focus:border-transparent pr-12"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !secret.trim()}
            className="w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #a2c828, #7d9c1f)' }}
          >
            {loading ? 'Memverifikasi...' : 'Masuk ke Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================
// STAT CARD
// ============================================

function StatCard({ title, value, subtitle, icon: Icon, iconBg, growth }: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  iconBg: string;
  growth?: number | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
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

// ============================================
// MAIN ADMIN DASHBOARD
// ============================================

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersPagination, setUsersPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [paymentsPagination, setPaymentsPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'payments'>('users');

  // Check if already authed
  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      adminFetch('/api/admin/stats')
        .then(() => setAuthed(true))
        .catch(() => clearAdminToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Load dashboard data
  const loadData = useCallback(async () => {
    if (!authed) return;
    try {
      const [statsRes, chartsRes] = await Promise.all([
        adminFetch<{ stats: Stats }>('/api/admin/stats'),
        adminFetch<{ charts: ChartData }>('/api/admin/charts'),
      ]);
      setStats(statsRes.stats);
      setCharts(chartsRes.charts);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  }, [authed]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load users
  const loadUsers = useCallback(async (page = 1, search = '') => {
    if (!authed) return;
    try {
      const res = await adminFetch<{ users: UserRow[]; pagination: Pagination }>(
        `/api/admin/users?page=${page}&limit=10&search=${encodeURIComponent(search)}`
      );
      setUsers(res.users);
      setUsersPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, [authed]);

  // Load payments
  const loadPayments = useCallback(async (page = 1) => {
    if (!authed) return;
    try {
      const res = await adminFetch<{ payments: PaymentRow[]; pagination: Pagination }>(
        `/api/admin/payments?page=${page}&limit=10`
      );
      setPayments(res.payments);
      setPaymentsPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load payments:', err);
    }
  }, [authed]);

  useEffect(() => {
    if (authed && activeTab === 'users') loadUsers(1, userSearch);
    if (authed && activeTab === 'payments') loadPayments(1);
  }, [authed, activeTab, loadUsers, loadPayments, userSearch]);

  const handleLogout = () => {
    clearAdminToken();
    setAuthed(false);
    setStats(null);
    setCharts(null);
  };

  // Loading splash
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#a2c828] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Login screen
  if (!authed) {
    return <AdminLogin onLogin={() => { setAuthed(true); }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #a2c828, #7d9c1f)'}}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">FinChat Admin</h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stat Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Users"
              value={formatNumber(stats.totalUsers)}
              subtitle={`+${stats.newUsersThisMonth} bulan ini`}
              icon={Users}
              iconBg="bg-blue-500"
              growth={stats.userGrowthPercent}
            />
            <StatCard
              title="Total Revenue"
              value={formatRupiah(stats.totalRevenue)}
              subtitle={`${formatRupiah(stats.revenueThisMonth)} bulan ini`}
              icon={DollarSign}
              iconBg="bg-emerald-500"
            />
            <StatCard
              title="Total Transaksi"
              value={formatNumber(stats.totalTransactions)}
              subtitle={`${formatNumber(stats.transactionsThisMonth)} bulan ini`}
              icon={ReceiptText}
              iconBg="bg-violet-500"
            />
            <StatCard
              title="Active Subscribers"
              value={stats.activeSubscribers.toString()}
              subtitle={stats.planDistribution.map(p => `${p.plan}: ${p.count}`).join(' · ')}
              icon={Crown}
              iconBg="bg-amber-500"
            />
          </div>
        )}

        {/* Charts */}
        {charts && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} className="text-blue-500" />
                <h3 className="text-sm font-semibold text-slate-700">User Growth</h3>
              </div>
              <p className="text-xs text-slate-400">New signups per bulan</p>
              <MiniBarChart data={charts.userGrowth} labels={charts.months} color="#3B82F6" formatter={(n) => `${n} users`} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={16} className="text-emerald-500" />
                <h3 className="text-sm font-semibold text-slate-700">Revenue</h3>
              </div>
              <p className="text-xs text-slate-400">Paid revenue per bulan</p>
              <MiniBarChart data={charts.revenue} labels={charts.months} color="#10B981" formatter={formatRupiah} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 size={16} className="text-violet-500" />
                <h3 className="text-sm font-semibold text-slate-700">Transaksi</h3>
              </div>
              <p className="text-xs text-slate-400">Total transactions per bulan</p>
              <MiniBarChart data={charts.transactions} labels={charts.months} color="#8B5CF6" formatter={(n) => `${formatNumber(n)} txn`} />
            </div>
          </div>
        )}

        {/* Tabs + Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Tab buttons */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'users' ? 'text-[#a2c828]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Users
              {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a2c828]" />}
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'payments' ? 'text-[#a2c828]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Payments
              {activeTab === 'payments' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a2c828]" />}
            </button>
          </div>

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              {/* Search */}
              <div className="p-4 border-b border-slate-100">
                <div className="relative max-w-sm">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama, username, atau telegram ID..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a2c828] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 text-xs uppercase tracking-wider bg-slate-50">
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Telegram ID</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium text-right">Transaksi</th>
                      <th className="px-4 py-3 font-medium">Bergabung</th>
                      <th className="px-4 py-3 font-medium">Aktivitas Terakhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-slate-800">{user.name}</div>
                            {user.username && <div className="text-xs text-slate-400">@{user.username}</div>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{user.telegram_id}</td>
                        <td className="px-4 py-3">{planBadge(user.plan)}</td>
                        <td className="px-4 py-3 text-right text-slate-600 font-medium">{user.transaction_count}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(user.created_at)}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(user.last_transaction_at)}</td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-slate-400">Tidak ada data user</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {usersPagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    {usersPagination.total} users · Halaman {usersPagination.page}/{usersPagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadUsers(usersPagination.page - 1, userSearch)}
                      disabled={usersPagination.page <= 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => loadUsers(usersPagination.page + 1, userSearch)}
                      disabled={usersPagination.page >= usersPagination.totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 text-xs uppercase tracking-wider bg-slate-50">
                      <th className="px-4 py-3 font-medium">Order ID</th>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                      <th className="px-4 py-3 font-medium">Method</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{payment.order_id}</td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-slate-800">{payment.user_name}</div>
                            {payment.user_username && <div className="text-xs text-slate-400">@{payment.user_username}</div>}
                          </div>
                        </td>
                        <td className="px-4 py-3">{planBadge(payment.plan)}</td>
                        <td className="px-4 py-3 text-right text-slate-700 font-medium">{formatRupiah(parseFloat(String(payment.amount)))}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs capitalize">{payment.payment_method || '-'}</td>
                        <td className="px-4 py-3">{statusBadge(payment.status)}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(payment.paid_at || payment.created_at)}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-400">Belum ada payment</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {paymentsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    {paymentsPagination.total} payments · Halaman {paymentsPagination.page}/{paymentsPagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadPayments(paymentsPagination.page - 1)}
                      disabled={paymentsPagination.page <= 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => loadPayments(paymentsPagination.page + 1)}
                      disabled={paymentsPagination.page >= paymentsPagination.totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
