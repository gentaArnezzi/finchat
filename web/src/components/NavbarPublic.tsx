'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function NavbarPublic() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTelegramAuth = useCallback(async (user: any) => {
    try {
      const result = await api.telegramAuth(user);
      if (result.success) {
        router.push('/dashboard');
      }
    } catch {
      try {
        await api.login(user.id, user.first_name, user.username);
        router.push('/dashboard');
      } catch (error) {
        console.error('Login failed:', error);
      }
    }
  }, [router]);

  useEffect(() => {
    const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
    const link = botName && botName !== 'your_bot_username' 
      ? `https://t.me/${botName}?start=auth` 
      : '';
    
    window.onTelegramAuth = handleTelegramAuth;
    
    // We try to append to both possible widget places (desktop/mobile layout)
    const renderButton = (containerId: string) => {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
        const btn = document.createElement('a');
        btn.className = 'px-3 py-1.5 bg-[#54a9eb] text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-[#4293e6] transition-colors';
        btn.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.11.03-1.84 1.18-5.2 3.45-.49.34-.94.5-1.35.49-.45-.01-1.32-.26-1.96-.46-.79-.26-1.42-.4-1.36-.84.03-.23.35-.47.96-.73 3.77-1.64 6.29-2.73 7.55-3.25 3.59-1.48 4.34-1.74 4.83-1.75.11 0 .35.03.48.14.11.08.14.2.15.28.02.04.02.16.01.27z"/></svg> Login with Telegram`;
        
        if (link) {
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          if (isMobile) {
            btn.href = `tg://resolve?domain=${botName}&start=auth`;
          } else {
            btn.href = link;
            btn.target = '_blank';
            btn.rel = 'noopener noreferrer';
            btn.onclick = (e) => {
              const confirmOpen = confirm(
                "Buka Telegram?\\n\\n" +
                "Jika Telegram belum terinstall, Buka browser dan:\\n" +
                "1. Kunjungi: https://t.me/" + botName + "\\n" +
                "2. Ketik /start untuk login\\n\\n" +
                "Klik OK untuk ke t.me, Cancel untuk copy link."
              );
              if (!confirmOpen) {
                e.preventDefault();
                navigator.clipboard.writeText(link);
                alert("Link disalin ke clipboard:\\n" + link);
              }
            };
          }
        } else {
          btn.href = '#';
          btn.onclick = (e) => {
            e.preventDefault();
            alert("Bot belum dikonfigurasi. Hubungi admin.");
          };
        }
        container.appendChild(btn);
      }
    };

    renderButton('telegram-widget-header');
    

    
    return () => {
      window.onTelegramAuth = undefined;
    };
  }, [handleTelegramAuth]);

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-500 border-b ${isScrolled ? 'bg-white/90 backdrop-blur-md border-slate-200/60 shadow-sm py-3' : 'bg-transparent border-transparent py-4'}`}>
      <div className="max-w-6xl mx-auto px-6 sm:px-8 flex justify-between items-center">
        <Link href="/" className="flex items-center group">
          <div className="flex items-center justify-center transition-transform group-hover:scale-105">
            <img src="/Logofinchat-transparent.png" alt="FinChat Logo" className="h-8 md:h-9 w-auto object-contain" />
          </div>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
          <a href="/#solusi" className="hover:text-slate-900 transition-colors">Fitur</a>
          <Link href="/pricing" className="hover:text-slate-900 transition-colors">Harga</Link>
          <Link href="/blog" className="hover:text-slate-900 transition-colors">Blog</Link>
          <a href="/#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          <div className="w-[1px] h-4 bg-slate-300 mx-2"></div>
          <div id="telegram-widget-header" className="h-[38px] flex items-center justify-center overflow-hidden rounded-lg"></div>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-500 hover:text-slate-900"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg">
          <div className="px-6 py-4 space-y-3">
            <a href="/#solusi" className="block py-2 text-slate-600 hover:text-slate-900" onClick={() => setMobileMenuOpen(false)}>Fitur</a>
            <Link href="/pricing" className="block py-2 text-slate-600 hover:text-slate-900" onClick={() => setMobileMenuOpen(false)}>Harga</Link>
            <Link href="/blog" className="block py-2 text-slate-600 hover:text-slate-900" onClick={() => setMobileMenuOpen(false)}>Blog</Link>
            <a href="/#faq" className="block py-2 text-slate-600 hover:text-slate-900" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <div className="pt-3 border-t border-slate-100">
              {process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME && process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME !== 'your_bot_username' ? (
                <a
                  href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME}?start=auth`}
                  className="flex items-center justify-center gap-2 w-full py-2 bg-[#54a9eb] text-white text-sm font-medium rounded-lg"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.11.03-1.84 1.18-5.2 3.45-.49.34-.94.5-1.35.49-.45-.01-1.32-.26-1.96-.46-.79-.26-1.42-.4-1.36-.84.03-.23.35-.47.96-.73 3.77-1.64 6.29-2.73 7.55-3.25 3.59-1.48 4.34-1.74 4.83-1.75.11 0 .35.03.48.14.11.08.14.2.15.28.02.04.02.16.01.27z"/>
                  </svg>
                  Login with Telegram
                </a>
              ) : (
                <div className="text-center text-sm text-slate-400">Bot belum dikonfigurasi</div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
