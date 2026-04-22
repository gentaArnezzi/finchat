'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AdminContextType {
  authed: boolean;
  loading: boolean;
  login: (secret: string) => Promise<boolean>;
  logout: () => void;
  adminFetch: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  const getSecret = () => typeof window !== 'undefined' ? localStorage.getItem('finchat_admin_secret') : null;

  const adminFetch = useCallback(async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const secret = getSecret();
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
        ...options.headers,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, []);

  useEffect(() => {
    const secret = getSecret();
    if (secret) {
      adminFetch('/api/admin/stats')
        .then(() => setAuthed(true))
        .catch(() => { localStorage.removeItem('finchat_admin_secret'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [adminFetch]);

  const login = async (secret: string): Promise<boolean> => {
    localStorage.setItem('finchat_admin_secret', secret);
    try {
      await adminFetch('/api/admin/stats');
      setAuthed(true);
      return true;
    } catch {
      localStorage.removeItem('finchat_admin_secret');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('finchat_admin_secret');
    setAuthed(false);
  };

  return (
    <AdminContext.Provider value={{ authed, loading, login, logout, adminFetch }}>
      {children}
    </AdminContext.Provider>
  );
}
