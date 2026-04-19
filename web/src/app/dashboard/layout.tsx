'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { WebSocketProvider, useWebSocket } from '@/context/WebSocketContext';
import { LayoutDashboard, ReceiptText, TrendingUp, Wallet, Zap, LogOut, Settings, Menu, X } from 'lucide-react';
import Image from 'next/image';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const { socket } = useWebSocket(userId || undefined);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
      localStorage.setItem('finchat_token', tokenFromUrl);
    }
    
    const token = api.getToken();
    if (!token) {
      router.push('/');
    } else {
      // Decode token to get user ID
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(payload.id);
      } catch (e) {
        console.error('Failed to decode token');
      }
    }
  }, [router]);

  const navLinks = [
    { href: '/dashboard', label: 'Beranda', icon: <LayoutDashboard size={18} /> },
    { href: '/dashboard/transactions', label: 'Transaksi', icon: <ReceiptText size={18} /> },
    { href: '/dashboard/analytics', label: 'Analisis', icon: <TrendingUp size={18} /> },
    { href: '/dashboard/budget', label: 'Budget', icon: <Wallet size={18} /> },
    { href: '/dashboard/settings', label: 'Pengaturan', icon: <Settings size={18} /> },
    { href: '/dashboard/upgrade', label: 'Upgrade', icon: <Zap size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden mr-4 p-2 text-slate-500 hover:text-slate-700"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white overflow-hidden flex items-center justify-center border border-slate-100">
                  <Image src="/finchat-logo.png" alt="FinChat Logo" width={32} height={32} className="w-full h-full object-cover" />
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">FinChat</span>
              </div>
              <div className="hidden md:flex ml-10 space-x-8">
                {navLinks.map((link) => {
                  const isActive = link.href === '/dashboard' 
                    ? pathname === '/dashboard' 
                    : pathname.startsWith(link.href);
                  
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`inline-flex items-center px-1 pt-1 h-full border-b-2 text-sm font-medium transition-all ${
                        isActive 
                          ? 'border-indigo-600 text-indigo-600' 
                          : 'border-transparent text-slate-500 hover:text-indigo-600 hover:border-indigo-200'
                      }`}
                    >
                      <span className="mr-2 mb-0.5">{link.icon}</span>
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  api.clearToken();
                  router.push('/');
                }}
                className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
              >
                <LogOut size={18} />
                Keluar
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200">
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => {
                const isActive = link.href === '/dashboard' 
                  ? pathname === '/dashboard' 
                  : pathname.startsWith(link.href);
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-indigo-50 text-indigo-600' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}
              <button
                onClick={() => {
                  api.clearToken();
                  router.push('/');
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full"
              >
                <LogOut size={18} />
                Keluar
              </button>
            </div>
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WebSocketProvider>
      <DashboardContent>{children}</DashboardContent>
    </WebSocketProvider>
  );
}