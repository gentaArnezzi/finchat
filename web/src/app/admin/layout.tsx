'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AdminProvider, useAdmin } from '@/context/AdminContext';
import {
  LayoutDashboard, Users, ReceiptText, CreditCard, Crown,
  LogOut, Shield, Menu, X, Eye, EyeOff
} from 'lucide-react';

// ============================================
// LOGIN SCREEN
// ============================================

function AdminLogin() {
  const { login } = useAdmin();
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true);
    setError('');
    const ok = await login(secret.trim());
    if (!ok) setError('Secret key invalid atau server tidak merespons');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 overflow-hidden">
            <Image src="/logo_FINChat-removebg-preview.png" alt="FinChat" width={80} height={80} className="w-full h-full object-contain" />
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
              <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300">
                {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>}
          <button type="submit" disabled={loading || !secret.trim()} className="w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #a2c828, #7d9c1f)' }}>
            {loading ? 'Memverifikasi...' : 'Masuk ke Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================
// SIDEBAR + LAYOUT
// ============================================

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/transactions', label: 'Transaksi', icon: ReceiptText },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: Crown },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const { authed, loading, logout } = useAdmin();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#a2c828] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) return <AdminLogin />;

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900 border-r border-slate-800 fixed inset-y-0 left-0 z-40">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800">
          <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
            <Image src="/logo_FINChat-removebg-preview.png" alt="FinChat" width={40} height={40} className="w-full h-full object-contain" />
          </div>
          <span className="text-white font-bold text-lg">FinChat Admin</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-[#a2c828]/15 text-[#a2c828]' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}>
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-slate-800">
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 w-full transition-all">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-slate-900 h-full flex flex-col">
            <div className="flex items-center justify-between px-6 h-16 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #a2c828, #7d9c1f)'}}>
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold">FinChat Admin</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive ? 'bg-[#a2c828]/15 text-[#a2c828]' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}>
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t border-slate-800">
              <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 w-full transition-all">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar - mobile */}
        <header className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-600 hover:text-slate-900">
              <Menu size={22} />
            </button>
            <span className="text-sm font-bold text-slate-800">FinChat Admin</span>
            <button onClick={logout} className="text-slate-400 hover:text-red-500"><LogOut size={18} /></button>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
