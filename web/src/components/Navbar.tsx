'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getMe().then(data => {
        if (data.success) setUser(data.user);
      }).catch(() => api.clearToken());
    }
  }, []);

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/dashboard', label: 'Beranda', icon: '🏠' },
    { href: '/dashboard/transactions', label: 'Transaksi', icon: '📋' },
    { href: '/dashboard/analytics', label: 'Analisis', icon: '📊' },
    { href: '/dashboard/budget', label: 'Budget', icon: '💰' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold text-emerald-600">
              FinChat
            </Link>
            <div className="hidden md:flex ml-10 space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    pathname === link.href
                      ? 'text-emerald-600 border-b-2 border-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-1">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Keluar
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}