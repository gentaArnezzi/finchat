'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
      };
    };
  }
}

export default function MiniAppPage() {
  const [status, setStatus] = useState('Menghubungkan...');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      try {
        const tg = window.Telegram?.WebApp;
        const initData = tg?.initData;
        
        if (!initData) {
          const urlParams = new URLSearchParams(window.location.search);
          const token = urlParams.get('token');
          
          if (token) {
            localStorage.setItem('finchat_token', token);
            router.push('/dashboard');
            return;
          }
          
          setError('Buka dari Telegram Bot ya!');
          return;
        }

        if (tg && tg.ready) {
          tg.ready();
        }

        const res = await fetch('/api/users/telegram-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData })
        });

        const data = await res.json();
        
        if (data.token) {
          localStorage.setItem('finchat_token', data.token);
          router.push('/dashboard');
        } else {
          setError(data.error || 'Gagal terhubung');
        }
      } catch (err) {
        setError('Terjadi kesalahan');
      }
    };

    init();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <p className="text-slate-500 text-sm">Buka dari Telegram Bot untuk menggunakan FinChat</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">{status}</p>
        </div>
      </div>
    </>
  );
}