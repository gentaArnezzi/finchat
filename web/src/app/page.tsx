'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  Wallet, Send, BarChart3, Zap, ShieldCheck, 
  ArrowRight, Smartphone, CheckCircle2, MessageSquare, 
  ChevronRight, ChevronDown, Sparkles, Globe, Clock, PieChart,
  LayoutDashboard, List, LogIn
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

declare global {
  interface Window {
    onTelegramAuth?: (user: any) => void;
  }
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 py-5">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left flex justify-between items-center focus:outline-none"
      >
        <h4 className="text-lg font-medium text-slate-900">{question}</h4>
        <ChevronDown 
          size={20} 
          className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-48 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-slate-600 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [chatStep, setChatStep] = useState(0);
  const [dashboardTab, setDashboardTab] = useState('ringkasan');

  useEffect(() => {
    let mounted = true;
    const sequence = async () => {
      while (mounted) {
        setChatStep(0);
        await new Promise(r => setTimeout(r, 1000));
        if (!mounted) break;
        setChatStep(1);
        await new Promise(r => setTimeout(r, 600));
        if (!mounted) break;
        setChatStep(2);
        await new Promise(r => setTimeout(r, 1500));
        if (!mounted) break;
        setChatStep(3);
        await new Promise(r => setTimeout(r, 5000));
      }
    };
    sequence();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

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

  const [botLink, setBotLink] = useState('');

  useEffect(() => {
    const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
    const link = botName && botName !== 'your_bot_username' 
      ? `https://t.me/${botName}?start=auth` 
      : '';
    setBotLink(link);
    
    window.onTelegramAuth = handleTelegramAuth;
    
    const headerContainer = document.getElementById('telegram-widget-header');
    if (headerContainer) {
      headerContainer.innerHTML = '';
      const btn = document.createElement('a');
      btn.className = 'px-3 py-1.5 bg-[#54a9eb] text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-[#4293e6] transition-colors';
      btn.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.11.03-1.84 1.18-5.2 3.45-.49.34-.94.5-1.35.49-.45-.01-1.32-.26-1.96-.46-.79-.26-1.42-.4-1.36-.84.03-.23.35-.47.96-.73 3.77-1.64 6.29-2.73 7.55-3.25 3.59-1.48 4.34-1.74 4.83-1.75.11 0 .35.03.48.14.11.08.14.2.15.28.02.04.02.16.01.27z"/></svg> Login with Telegram`;
      
      if (link) {
        // Check if Telegram app is available
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          btn.href = `tg://resolve?domain=${botName}&start=auth`;
        } else {
          // Desktop - open t.me in browser, show fallback message
          btn.href = link;
          btn.target = '_blank';
          btn.rel = 'noopener noreferrer';
          btn.onclick = (e) => {
            const confirmOpen = confirm(
              "Buka Telegram?\n\n" +
              "Jika Telegram belum terinstall, Buka browser dan:\n" +
              "1. Kunjungi: https://t.me/" + botName + "\n" +
              "2. Ketik /start untuk login\n\n" +
              "Klik OK untuk ke t.me, Cancel untuk copy link."
            );
            if (!confirmOpen) {
              e.preventDefault();
              navigator.clipboard.writeText(link);
              alert("Link disalin ke clipboard:\n" + link);
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
      headerContainer.appendChild(btn);
    }
    
    // Also load telegram widget script for auth callback
    const widgetBotName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
    if (widgetBotName && widgetBotName !== 'your_bot_username') {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', widgetBotName);
      script.setAttribute('data-size', 'medium');
      script.setAttribute('data-radius', '8');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      script.async = true;
      document.body.appendChild(script);
    }
    
    return () => {
      window.onTelegramAuth = undefined;
    };
  }, [handleTelegramAuth]);

  return (
    <div className="min-h-screen bg-[#fafafa] selection:bg-slate-200 selection:text-slate-900 font-sans text-slate-800">
      {/* HEADER: Minimalist & Transparent -> Solid */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 border-b ${isScrolled ? 'bg-white/90 backdrop-blur-md border-slate-200/60 shadow-sm py-4' : 'bg-transparent border-transparent py-6'}`}>
        <div className="max-w-6xl mx-auto px-6 sm:px-8 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-white overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105">
              <Image src="/finchat-logo.png" alt="FinChat Logo" width={32} height={32} className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">FinChat</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
            <a href="#solusi" className="hover:text-slate-900 transition-colors">Fitur</a>
            <Link href="/pricing" className="hover:text-slate-900 transition-colors">Harga</Link>
            <Link href="/blog" className="hover:text-slate-900 transition-colors">Blog</Link>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
            <div className="w-[1px] h-4 bg-slate-300 mx-2"></div>
            <div id="telegram-widget-header" className="h-[38px] flex items-center justify-center overflow-hidden rounded-lg"></div>
          </nav>
        </div>
      </header>

      {/* HERO: Elegant & Typographic Focus */}
      <section className="relative pt-40 pb-24 lg:pt-48 lg:pb-32 overflow-x-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
        <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-slate-100 to-transparent pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">
          
          {/* Text Content */}
          <div className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start lg:max-w-xl xl:max-w-2xl">
            <h1 className="text-5xl md:text-6xl xl:text-7xl font-bold text-slate-900 tracking-tight leading-[1.05] mb-8">
              Kendalikan Keuanganmu, <br className="hidden md:block lg:hidden xl:block" /> Cukup Lewat <span className="text-slate-400 italic">Chat</span>.
            </h1>
            
            <p className="text-xl text-slate-500 mb-12 max-w-2xl leading-relaxed">
              Tidak perlu aplikasi rumit. Tidak perlu form berlapis. <br className="hidden sm:block lg:hidden xl:block" />
              Gunakan kebiasaan harian Anda di Telegram untuk mencatat, menganalisa, dan mengelola dana dalam hitungan detik.
            </p>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4 w-full sm:w-auto">
              <a
                href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'finchatme_bot'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-gradient-to-br from-indigo-600 to-slate-900 hover:shadow-xl hover:shadow-indigo-900/20 text-white text-sm font-semibold rounded-full transition-all active:scale-95 border-none"
              >
                <Send size={16} />
                Mulai Chat Gratis
              </a>
              <a
                href="#cara-kerja"
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-white text-slate-700 text-sm font-semibold rounded-full border border-slate-200 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
              >
                Lihat Cara Kerja
              </a>
            </div>
            
            <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm font-medium text-slate-400">
              <div className="flex items-center gap-2"><CheckCircle2 size={16}/> Gratis Terbatas</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={16}/> Tanpa Instalasi</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={16}/> Enkripsi Aman</div>
            </div>
          </div>

          {/* Phone Mockup Showcase */}
          <div className="flex-1 w-full flex justify-center lg:justify-end relative z-10 mt-16 lg:mt-0">
             {/* Decorative background glow */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-gradient-to-tr from-indigo-200/40 to-emerald-200/40 rounded-full blur-[80px] pointer-events-none"></div>
             
             {/* Realistic Phone Frame Wrapper */}
             <div className="w-[300px] md:w-[340px] aspect-[9/19] bg-[#1a1c23] shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-[3rem] p-2.5 z-20 relative ring-1 ring-slate-900/5 hover:-translate-y-2 transition-transform duration-700">
               {/* Hardware Buttons */}
               <div className="absolute top-24 -left-1 w-1 h-12 bg-[#2a2d36] rounded-l-md"></div> {/* Volume Up */}
               <div className="absolute top-40 -left-1 w-1 h-12 bg-[#2a2d36] rounded-l-md"></div> {/* Volume Down */}
               <div className="absolute top-32 -right-1 w-1 h-16 bg-[#2a2d36] rounded-r-md"></div> {/* Power Button */}
               
               {/* Inner Screen */}
               <div className="w-full h-full bg-white rounded-[2.25rem] overflow-hidden flex flex-col relative shadow-[inset_0_0_10px_rgba(0,0,0,0.1)]">
                 {/* Notch */}
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 md:h-7 bg-[#1a1c23] rounded-b-3xl z-30 flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700/50"></div>
                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#0a0a0a] shadow-inner border border-white/5"></div>
                 </div>
                 
                 {/* Phone Status Bar (Fake) */}
                 <div className="h-8 md:h-9 w-full bg-slate-50 flex justify-between items-center px-6 pt-2 md:pt-3 text-[10px] font-bold text-slate-800 relative z-20">
                   <span>9:41</span>
                   <div className="flex gap-1.5 items-center">
                     <div className="flex gap-0.5 items-end h-2.5">
                       <div className="w-0.5 h-1 bg-slate-800 rounded-sm"></div>
                       <div className="w-0.5 h-1.5 bg-slate-800 rounded-sm"></div>
                       <div className="w-0.5 h-2 bg-slate-800 rounded-sm"></div>
                       <div className="w-0.5 h-2.5 bg-slate-800 rounded-sm"></div>
                     </div>
                     <span>5G</span>
                   </div>
                 </div>

                 {/* Telegram Header */}
                 <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 mt-0.5 flex items-center gap-3 relative z-20">
                   <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-inner">
                     FC
                   </div>
                   <div>
                     <p className="text-sm md:text-base font-bold text-slate-900 leading-tight">FinChat Bot</p>
                     <p className="text-[10px] md:text-[11px] text-slate-500 font-medium">bot</p>
                   </div>
                 </div>

                 {/* Chat Body */}
                 <div className="flex-1 bg-[url('https://web.telegram.org/a/chat-bg-pattern-light.png')] bg-[#e4e4e4] bg-blend-soft-light bg-cover p-3 md:p-4 space-y-3 flex flex-col justify-end relative z-10">
                   {/* Dummy history */}
                   <div className="flex justify-start opacity-70">
                     <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm px-3 py-2 text-xs md:text-[13px] shadow-sm max-w-[90%]">
                       Menu Utama:<br/>1. Catat<br/>2. Laporan
                     </div>
                   </div>

                   {chatStep >= 1 && (
                     <div className="flex justify-end animate-slide-up-fade">
                       <div className="bg-[#e1ffc7] text-slate-800 rounded-2xl rounded-tr-sm px-3 py-2 md:py-2.5 text-[13px] md:text-[14px] w-fit shadow-sm">
                         Beli kopi 25rb
                       </div>
                     </div>
                   )}
                   {chatStep === 2 && (
                     <div className="flex justify-start animate-slide-up-fade">
                       <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 md:py-3.5 text-xs shadow-sm max-w-[90%] flex items-center gap-1.5">
                         <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-slate-400 rounded-full typing-dot"></span>
                         <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-slate-400 rounded-full typing-dot"></span>
                         <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-slate-400 rounded-full typing-dot"></span>
                       </div>
                     </div>
                   )}
                   {chatStep >= 3 && (
                     <div className="flex justify-start animate-slide-up-fade">
                       <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm px-3 py-2 md:py-2.5 text-[13px] md:text-[14px] shadow-sm max-w-[90%]">
                         ✅ <b>Makanan & Minuman</b> <br/>
                         Rp 25.000 dicatat! <br/>
                         <span className="text-[11px] md:text-[12px] text-slate-500 mt-1 block">Sisa limit harian: Rp 75.000</span>
                       </div>
                     </div>
                   )}
                 </div>

                 {/* Input Mockup */}
                 <div className="bg-white border-t border-slate-100 p-2 md:p-3 flex items-center gap-2 relative z-20 pb-6 md:pb-8">
                   <div className="w-6 h-6 flex items-center justify-center text-slate-400 shrink-0">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                   </div>
                   <div className="flex-1 bg-slate-100 h-9 md:h-10 rounded-full px-4 flex items-center text-xs md:text-sm text-slate-400">
                     Message...
                   </div>
                   <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                   </div>
                 </div>

                 {/* Home Indicator */}
                 <div className="absolute bottom-1.5 md:bottom-2 left-1/2 -translate-x-1/2 w-32 md:w-36 h-1 md:h-1.5 bg-slate-900 rounded-full z-30"></div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF / TICKER */}
      <section className="py-12 bg-white border-y border-slate-100 flex justify-center items-center overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay pointer-events-none"></div>
        <FadeIn className="flex flex-col items-center z-10 w-full px-6">
          <p className="text-[11px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-8 text-center max-w-sm md:max-w-none">Digunakan harian untuk memproses insight</p>
          <div className="flex flex-col md:flex-row justify-center gap-10 md:gap-20 text-slate-300 items-center opacity-80">
            <div className="flex flex-col md:flex-row items-center gap-3"><MessageSquare size={28} className="text-indigo-200"/> <span className="text-xl md:text-2xl font-black font-sans tracking-tight text-slate-800">1.2JT+ PESAN</span></div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 hidden md:block"></div>
            <div className="flex flex-col md:flex-row items-center gap-3"><PieChart size={28} className="text-emerald-200"/> <span className="text-xl md:text-2xl font-black font-sans tracking-tight text-slate-800">50RB+ LAPORAN</span></div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 hidden md:block"></div>
            <div className="flex flex-col md:flex-row items-center gap-3"><Zap size={28} className="text-amber-200"/> <span className="text-xl md:text-2xl font-black font-sans tracking-tight text-slate-800">A.I POWERED</span></div>
          </div>
        </FadeIn>
      </section>

      {/* FEATURE 1: SEAMLESS INPUT */}
      <section id="fitur-chat" className="py-24 md:py-32 relative overflow-hidden bg-white border-b border-slate-50">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
            {/* Left: Copy */}
            <div className="lg:w-[45%]">
              <FadeIn>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-widest mb-6">
                  <Smartphone size={14} /> Sinkronisasi Real-Time
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-[1.1]">
                  Pencatatan Semudah <span className="text-indigo-600">Chatting Ke Teman.</span>
                </h2>
                <p className="text-slate-500 text-lg md:text-xl leading-relaxed mb-8">
                  Pilih sesukamu: kirim pesan santai atau gunakan <i>command</i> singkat. Lupakan aplikasi yang dipenuhi menu tersembunyi. Dengan FinChat, mencatat pengeluaran di jalan hanya butuh 3 detik saja.
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3.5 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-2xl shadow-sm"><CheckCircle2 className="text-indigo-500 shrink-0 mt-0" size={20}/> <span className="font-medium text-sm">Bahasa gaul, singkatan, typo? Model kami mengerti konteks pembicaraan.</span></li>
                  <li className="flex items-start gap-3.5 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-2xl shadow-sm"><CheckCircle2 className="text-indigo-500 shrink-0 mt-0" size={20}/> <span className="font-medium text-sm">Tidak perlu unduh dan penuhi memori HP dengan aplikasi baru.</span></li>
                  <li className="flex items-start gap-3.5 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-2xl shadow-sm"><CheckCircle2 className="text-indigo-500 shrink-0 mt-0" size={20}/> <span className="font-medium text-sm">Berjalan super cepat via integrasi cloud Telegram Chat API.</span></li>
                </ul>
              </FadeIn>
            </div>
            {/* Right: Visual */}
            <div className="lg:w-[55%] w-full relative">
              <FadeIn delay={200} className="relative z-10 flex justify-center">
                {/* Floating backgrounds */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-gradient-to-tr from-indigo-100 scale-150 rounded-full blur-[100px] pointer-events-none -z-10"></div>
                
                {/* Phone Frame */}
                <div className="relative rounded-[3rem] border-[10px] w-full max-w-[340px] border-[#0a0f1d] bg-[#f8fafc] shadow-2xl p-2 md:p-3 overflow-hidden transform md:rotate-2 hover:rotate-0 transition-all duration-700 mx-auto">
                  {/* Dynamic Island Mock */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-[#0a0f1d] rounded-b-3xl z-20"></div>
                  
                  {/* Bot Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200 pt-7 px-3 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 shadow-md flex items-center justify-center text-white"><Sparkles size={18}/></div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 tracking-tight leading-tight">FinChat AI Tracker</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Bot</p>
                    </div>
                  </div>
                  
                  {/* Chat bubbles */}
                  <div className="space-y-4 pt-4 px-2 h-[420px] overflow-hidden flex flex-col justify-end pb-3 bg-[url('/noise.svg')] bg-[length:100px] relative z-0">
                    <div className="absolute inset-0 bg-[#f8fafc] mix-blend-color z-0"></div>
                    <div className="relative z-10 space-y-4">
                      {/* User */}
                      <div className="ml-auto w-fit bg-emerald-500 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm shadow-[0_4px_10px_-4px_rgba(16,185,129,0.5)] max-w-[85%]">
                        "Abis makan padang 45rb bang"
                      </div>
                      {/* Bot */}
                      <div className="mr-auto w-fit bg-white border border-slate-200/60 p-3.5 rounded-2xl rounded-tl-sm text-sm shadow-md text-slate-700 max-w-[90%]">
                        <div className="font-bold text-slate-900 mb-2 border-b border-slate-100 pb-2 flex justify-between items-center">
                          <span className="flex items-center gap-1.5"><Wallet size={12} className="text-rose-500"/> Pengeluaran</span> 
                          <span className="font-mono text-emerald-600 font-black text-xs">Rp45.000</span>
                        </div>
                        <p className="text-[11px] mb-1.5"><span className="text-slate-400 uppercase font-bold tracking-wider">Kategori:</span> <span className="font-semibold text-slate-800">Makanan & Minuman</span></p>
                        <p className="text-[11px]"><span className="text-slate-400 uppercase font-bold tracking-wider">Tercatat:</span> Hari ini, 12:45 WIB</p>
                      </div>
                      {/* User 2 */}
                      <div className="ml-auto w-fit bg-emerald-500 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm shadow-[0_4px_10px_-4px_rgba(16,185,129,0.5)] max-w-[85%] mt-4">
                        "/ringkasan"
                      </div>
                      {/* Bot 2 */}
                      <div className="mr-auto w-full bg-white border border-slate-200/60 p-3.5 rounded-2xl rounded-tl-sm text-sm shadow-md text-slate-700">
                        <p className="font-black text-slate-900 mb-2 border-b border-slate-100 pb-2">📊 Bulan Ini (April)</p>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-bold text-rose-500">Keluaran</p>
                          <p className="text-xs font-black text-slate-800">Rp 3.450.000</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-bold text-emerald-500">Pemasukan</p>
                          <p className="text-xs font-black text-slate-800">Rp 9.000.000</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE 2: DARK MODE AI PARSER */}
      <section id="fitur-ai" className="py-32 relative overflow-hidden bg-[#070b14]">
        <div className="absolute top-0 right-0 w-[50%vw] h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#070b14]/0 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[50%vw] h-[300px] bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.08] mix-blend-overlay pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-6 sm:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16 lg:gap-20">
            {/* Right: Copy (reverse flex) */}
            <div className="lg:w-[45%]">
              <FadeIn>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6 border-b-2">
                  <Zap size={14} className="animate-pulse"/> NLP Engine
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight leading-[1.1]">
                  Autentikasi AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 drop-shadow-sm">Sangat Cerdas.</span>
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed mb-8">
                  Di balik layar, Model AI internal kami mengekstrak maksud finansial Anda. Tidak perlu lagi klik dan <i>scroll</i> puluhan kategori yang membosankan. Algoritma kami bekerja 24/7 menentukan klasifikasi dan konversi paling akurat.
                </p>
                <div className="flex items-center gap-4 bg-[#0a0f1d]/80 border border-slate-800/80 p-5 rounded-2xl shadow-xl backdrop-blur-md">
                  <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                    <CheckCircle2 size={24}/>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-wide">Akurasi 95%+ Indonesia</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">Mampu membedakan konteks bias seperti "Beli saham Netflix" (Investasi) vs "Bayar Netflix" (Hiburan).</p>
                  </div>
                </div>
              </FadeIn>
            </div>
            {/* Left: Code Visual */}
            <div className="lg:w-[55%] w-full relative">
              <FadeIn delay={200}>
                {/* Glow behind terminal */}
                <div className="absolute inset-0 bg-indigo-500/10 blur-[80px] rounded-[3rem]"></div>
                
                <div className="bg-[#0b1221] border border-[#1e293b] rounded-[2rem] shadow-[0_0_60px_-15px_rgba(99,102,241,0.2)] p-6 md:p-8 font-mono text-sm overflow-hidden relative group backdrop-blur-sm">
                  {/* Decorative terminal header */}
                  <div className="flex gap-2 mb-8 items-center border-b border-slate-800/50 pb-5">
                    <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    <span className="ml-4 text-[10px] uppercase font-bold tracking-widest text-slate-500">finchat-claude-parser.js</span>
                  </div>
                  <div className="text-slate-400 space-y-3 pl-2">
                    <p><span className="text-rose-400 font-bold">const</span> rawInput = <span className="text-amber-300 font-bold">"tadi nambal ban vespa kena 250rb wkwk"</span>;</p>
                    <p><span className="text-rose-400 font-bold">const</span> parsed = <span className="text-indigo-400 font-bold">await</span> FinChatAI.<span className="text-cyan-400 font-bold">process</span>(rawInput);</p>
                    <p className="pt-6 border-t border-slate-800/30 w-fit w-full pr-10 hover:text-slate-300 transition-colors"><span className="text-slate-500 italic">// Evaluated Node Response:</span></p>
                    <pre className="text-cyan-300 bg-[#070b14] p-5 rounded-2xl border border-slate-800/60 break-words whitespace-pre-wrap leading-relaxed shadow-inner font-medium text-[13px] md:text-sm">
{`{
  "status": `}<span className="text-emerald-400">"success"</span>{`,
  "intent": `}<span className="text-emerald-400">"expense"</span>{`,
  "amount": `}<span className="text-purple-400 font-bold">250000</span>{`,
  "category": `}<span className="text-emerald-400">"Transportasi"</span>{`,
  "raw_desc": `}<span className="text-emerald-400">"nambal ban vespa"</span>{`,
  "confidence": `}<span className="text-purple-400">0.98</span>{`
}`}
                    </pre>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>
      {/* MAC-STYLE DASHBOARD PREVIEW */}
      <section className="py-32 relative overflow-hidden bg-[#fafafa]">
        <FadeIn className="max-w-5xl mx-auto px-6 sm:px-8 relative z-10">
          <div className="text-center mb-16">
             <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-200 bg-white text-indigo-600 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
                <PieChart size={14} /> Sinkronisasi Otomatis
             </div>
             <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-[1.1]">Rekap Otomatis di <br className="hidden md:block"/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">Web Dashboard.</span></h2>
             <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto">Data rapi, keputusan tepat. Visualisasikan setiap pergerakan finansial Anda dengan antarmuka grafis kelas atas.</p>
          </div>

          <div className="relative rounded-[2rem] border border-slate-200/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] bg-white overflow-hidden flex flex-col hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] transition-shadow duration-700 aspect-[16/11] md:aspect-[16/9]">
            {/* Mac OS Header */}
            <div className="h-12 bg-slate-50/80 backdrop-blur-sm border-b border-slate-100 w-full flex items-center px-4 gap-2 z-20 absolute top-0 left-0 right-0">
              <div className="w-3.5 h-3.5 rounded-full bg-rose-400 shadow-sm border border-rose-500/20"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-sm border border-amber-500/20"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-sm border border-emerald-500/20"></div>
              <div className="ml-4 text-[11px] text-slate-400 font-semibold tracking-wide bg-white px-4 py-1.5 rounded-md shadow-sm border border-slate-100 mx-auto -translate-x-[40px]">finchat.id/dashboard</div>
            </div>
            
            {/* Split layout */}
            <div className="flex flex-1 overflow-hidden relative pt-12">
              {/* Sidebar */}
              <div className="w-56 bg-slate-50/50 border-r border-slate-100 p-4 hidden md:flex flex-col gap-1.5 z-10">
                <button onClick={() => setDashboardTab('ringkasan')} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full text-left ${dashboardTab === 'ringkasan' ? 'bg-white border border-slate-200 shadow-sm text-slate-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
                  <LayoutDashboard size={16} className={dashboardTab === 'ringkasan' ? 'text-indigo-600' : ''}/> Ringkasan
                </button>
                <button onClick={() => setDashboardTab('transaksi')} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full text-left ${dashboardTab === 'transaksi' ? 'bg-white border border-slate-200 shadow-sm text-slate-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
                  <List size={16} className={dashboardTab === 'transaksi' ? 'text-indigo-600' : ''}/> Transaksi
                </button>
                <button onClick={() => setDashboardTab('analisis')} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full text-left ${dashboardTab === 'analisis' ? 'bg-white border border-slate-200 shadow-sm text-slate-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
                  <PieChart size={16} className={dashboardTab === 'analisis' ? 'text-indigo-600' : ''}/> Analisis Data
                </button>
              </div>
              
              {/* Main Content */}
              {dashboardTab === 'ringkasan' && (
                <div className="flex-1 p-6 md:p-8 bg-white flex flex-col overflow-hidden animate-slide-up-fade">
                   <div className="flex justify-between items-center mb-6">
                     <h3 className="text-2xl font-bold text-slate-900">Ringkasan Bulan Ini</h3>
                     <div className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold inline-flex items-center gap-2">
                       <Clock size={12}/> April 2026
                     </div>
                   </div>
                   
                   {/* 3 Stats */}
                   <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                     <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 shadow-sm">
                       <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Pengeluaran</p>
                       <p className="text-xl md:text-2xl font-bold text-slate-900">Rp 4.250.000</p>
                     </div>
                     <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 shadow-sm">
                       <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Pemasukan</p>
                       <p className="text-xl md:text-2xl font-bold text-slate-900">Rp 12.000.000</p>
                     </div>
                     <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50 shadow-sm col-span-2 lg:col-span-1">
                       <p className="text-xs font-bold text-indigo-500 mb-1.5 uppercase tracking-wider">Sisa Saldo</p>
                       <p className="text-xl md:text-2xl font-black text-indigo-600">Rp 7.750.000</p>
                     </div>
                   </div>

                   {/* Chart + Recent split */}
                   <div className="flex-1 flex gap-5 min-h-0 relative">
                      <div className="flex-1 border border-slate-100 rounded-2xl p-5 flex flex-col justify-end gap-2 relative bg-white shadow-sm overflow-hidden">
                         <div className="flex justify-between items-start mb-auto">
                           <p className="text-sm font-bold text-slate-800">Tren Arus Kas</p>
                         </div>
                         <div className="flex items-end gap-3 h-[70%] w-full opacity-70">
                           {[30,50,40,70,55,85,60].map((h, i) => (
                             <div key={i} className="flex-1 h-full bg-slate-100 rounded-t-md relative group">
                               <div className="absolute bottom-0 w-full bg-indigo-500 rounded-t-md transition-all duration-1000" style={{height: `${h}%`}}></div>
                             </div>
                           ))}
                         </div>
                      </div>
                      
                      <div className="w-[40%] border border-slate-100 rounded-2xl p-5 hidden lg:flex flex-col bg-white shadow-sm">
                        <p className="text-sm font-bold text-slate-800 mb-4">Transaksi Terakhir</p>
                        <div className="flex flex-col gap-4">
                           {[
                             {name:'Chatime', cat:'Makanan Biasa', amt:'54.000'},
                             {name:'Voucher Listrik', cat:'Tagihan', amt:'150.000'},
                             {name:'Pertamax', cat:'Transportasi', amt:'100.000'},
                           ].map((tx, i) => (
                             <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                               <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                   <Wallet size={14}/>
                                 </div>
                                 <div>
                                   <p className="text-xs font-bold text-slate-800">{tx.name}</p>
                                   <p className="text-[10px] font-semibold text-slate-400">{tx.cat}</p>
                                 </div>
                               </div>
                               <span className="text-[11px] font-bold text-slate-600">-Rp {tx.amt}</span>
                             </div>
                           ))}
                        </div>
                      </div>
                   </div>
                </div>
              )}

              {/* TRANSAKSI TAB */}
              {dashboardTab === 'transaksi' && (
                <div className="flex-1 p-6 md:p-8 bg-white flex flex-col overflow-hidden animate-slide-up-fade">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-slate-900">Daftar Transaksi</h3>
                    <div className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold inline-flex items-center gap-2 cursor-pointer hover:bg-slate-200 transition-colors">
                      Bulan Ini <ChevronDown size={12}/>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden flex flex-col border border-slate-100 rounded-2xl shadow-sm">
                    <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-100 p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <div className="col-span-2">Deskripsi</div>
                      <div>Kategori</div>
                      <div className="text-right">Nominal</div>
                    </div>
                    <div className="p-3 flex flex-col gap-1 overflow-y-auto">
                      {[
                        {name:'Chatime (Gojek)', cat:'Makanan', amt:'- Rp 54.000', icon: 'Wallet', color: 'bg-orange-100 text-orange-600'},
                        {name:'Gaji Bulanan', cat:'Pendapatan', amt:'+ Rp 12.000.000', icon: 'Zap', color: 'bg-emerald-100 text-emerald-600'},
                        {name:'Voucher Listrik', cat:'Tagihan', amt:'- Rp 150.000', icon: 'Zap', color: 'bg-indigo-100 text-indigo-600'},
                        {name:'Pertamax 10L', cat:'Transportasi', amt:'- Rp 100.000', icon: 'ShieldCheck', color: 'bg-blue-100 text-blue-600'},
                        {name:'Langganan Netflix', cat:'Hiburan', amt:'- Rp 153.000', icon: 'Sparkles', color: 'bg-rose-100 text-rose-600'},
                        {name:'Makan Siang', cat:'Makanan', amt:'- Rp 85.000', icon: 'Wallet', color: 'bg-orange-100 text-orange-600'}
                      ].map((tx, i) => (
                        <div key={i} className="grid grid-cols-4 items-center p-3 hover:bg-slate-50 rounded-xl cursor-default transition-colors border-b border-slate-50 last:border-0 last:pb-2">
                          <div className="col-span-2 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.color}`}>
                              {tx.icon === 'Wallet' && <Wallet size={14}/>}
                              {tx.icon === 'Zap' && <Zap size={14}/>}
                              {tx.icon === 'ShieldCheck' && <ShieldCheck size={14}/>}
                              {tx.icon === 'Sparkles' && <Sparkles size={14}/>}
                            </div>
                            <span className="text-sm font-bold text-slate-800">{tx.name}</span>
                          </div>
                          <div className="text-xs font-semibold text-slate-500">{tx.cat}</div>
                          <div className={`text-right text-sm font-bold tracking-tight ${tx.amt.startsWith('+') ? 'text-emerald-500' : 'text-slate-700'}`}>{tx.amt}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ANALISIS DATA TAB */}
              {dashboardTab === 'analisis' && (
                <div className="flex-1 p-6 md:p-8 bg-white flex flex-col overflow-hidden animate-slide-up-fade">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-slate-900">Analisis Pengeluaran</h3>
                    <div className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold inline-flex items-center gap-2 cursor-pointer hover:bg-slate-200 transition-colors">
                      April 2026 <ChevronDown size={12}/>
                    </div>
                  </div>
                  <div className="flex-1 flex gap-10 items-center justify-center relative p-6 border border-slate-100 rounded-2xl shadow-sm overflow-hidden bg-slate-50/30">
                    {/* SVG Donut Chart */}
                    <div className="relative w-52 h-52 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 drop-shadow-sm">
                        <circle cx="50" cy="50" r="35" fill="transparent" stroke="#f1f5f9" strokeWidth="20" />
                        <circle cx="50" cy="50" r="35" fill="transparent" stroke="#818cf8" strokeWidth="20" strokeDasharray="98.9 219.9" />
                        <circle cx="50" cy="50" r="35" fill="transparent" stroke="#f472b6" strokeWidth="20" strokeDasharray="54.9 219.9" strokeDashoffset="-98.9" />
                        <circle cx="50" cy="50" r="35" fill="transparent" stroke="#fbbf24" strokeWidth="20" strokeDasharray="32.9 219.9" strokeDashoffset="-153.8" />
                        <circle cx="50" cy="50" r="35" fill="transparent" stroke="#34d399" strokeWidth="20" strokeDasharray="32.9 219.9" strokeDashoffset="-186.7" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-full w-32 h-32 ml-10 mt-10 shadow-sm border border-slate-50 z-10">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Byr</span>
                        <span className="text-lg font-black text-slate-800">Rp 4.25M</span>
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between w-40">
                        <div className="flex items-center gap-3">
                          <div className="w-3.5 h-3.5 rounded bg-indigo-400 shadow-sm"></div>
                          <p className="text-sm font-bold text-slate-700">Makanan</p>
                        </div>
                        <p className="text-xs font-bold text-slate-500">45%</p>
                      </div>
                      <div className="flex items-center justify-between w-40">
                        <div className="flex items-center gap-3">
                          <div className="w-3.5 h-3.5 rounded bg-pink-400 shadow-sm"></div>
                          <p className="text-sm font-bold text-slate-700">Tagihan</p>
                        </div>
                        <p className="text-xs font-bold text-slate-500">25%</p>
                      </div>
                      <div className="flex items-center justify-between w-40">
                        <div className="flex items-center gap-3">
                          <div className="w-3.5 h-3.5 rounded bg-amber-400 shadow-sm"></div>
                          <p className="text-sm font-bold text-slate-700">Transport</p>
                        </div>
                        <p className="text-xs font-bold text-slate-500">15%</p>
                      </div>
                      <div className="flex items-center justify-between w-40">
                        <div className="flex items-center gap-3">
                          <div className="w-3.5 h-3.5 rounded bg-emerald-400 shadow-sm"></div>
                          <p className="text-sm font-bold text-slate-700">Hiburan</p>
                        </div>
                        <p className="text-xs font-bold text-slate-500">15%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Fade out overlap text at bottom to indicate it's a preview */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none flex items-end justify-center pb-2">
                <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Pratinjau Dashboard FinChat</span>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* USE CASES / TESTIMONIALS */}
      <section className="py-28 relative overflow-hidden">
        <FadeIn className="max-w-6xl mx-auto px-6 sm:px-8 relative z-10">
           <div className="text-center mb-20">
             <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight drop-shadow-sm">Dipercaya oleh Mereka yang Menghargai Waktu.</h2>
             <p className="text-lg text-slate-500 max-w-2xl mx-auto">Bergabunglah dengan ribuan pengguna yang telah meninggalkan cara lama mencatat keuangan.</p>
           </div>
           
           <div className="grid md:grid-cols-3 gap-8">
              {/* Card Rina */}
              <div className="p-8 bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative hover:-translate-y-2 transition-transform duration-500 group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <div className="text-7xl absolute -top-2 left-4 opacity-10 text-indigo-500 font-serif leading-none transition-transform group-hover:-translate-y-1">"</div>
                <p className="text-slate-600 text-sm leading-relaxed mt-6 italic mb-10 relative z-10">"Sebel banget dulu kalau akhir bulan bingung uang habis ke mana. Pakai FinChat ngebantu banget karena aku tinggal ketik di Telegram pas lagi kerja. Limit bulanan juga bikin mikir dua kali kalau mau borong chatime."</p>
                <div className="flex items-center gap-4 mt-auto">
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold border border-indigo-200 shadow-sm">
                    R
                  </div>
                  <div>
                     <h4 className="font-bold text-sm text-slate-900">Rina</h4>
                     <p className="text-xs text-slate-500">Karyawan SCBD (26)</p>
                  </div>
                </div>
              </div>

              {/* Card Budi */}
              <div className="p-8 bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative hover:-translate-y-2 transition-transform duration-500 md:-translate-y-6 group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <div className="text-7xl absolute -top-2 left-4 opacity-10 text-emerald-500 font-serif leading-none transition-transform group-hover:-translate-y-1">"</div>
                <p className="text-slate-600 text-sm leading-relaxed mt-6 italic mb-10 relative z-10">"Fitur export-nya life-saver buat ngerapihin laporan duit project dan operasional sehari-hari. Plus karena aku langganan Pro, bisa bikin kategori kustom 'Server' dan 'Ads'. Gampang banget di-track."</p>
                <div className="flex items-center gap-4 mt-auto">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 font-bold border border-emerald-200 shadow-sm">
                    B
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Budi</h4>
                    <p className="text-xs text-slate-500">Freelance Developer (29)</p>
                  </div>
                </div>
              </div>
            </div>
        </FadeIn>
      </section>

      {/* FEATURE 4: BUDGET ALERT & PROACTIVE PROTECTION */}
      <section id="fitur-alert" className="py-32 relative overflow-hidden bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            {/* Left: Alerts Graphic */}
            <div className="lg:w-[45%] relative w-full flex justify-center">
              <FadeIn>
                <div className="absolute inset-0 bg-gradient-to-r from-rose-100 to-orange-100 blur-3xl opacity-60 rounded-full"></div>
                <div className="relative w-full max-w-[340px] h-[400px] bg-[#0c1222] rounded-[2.5rem] border border-slate-800 shadow-[0_20px_50px_-15px_rgba(244,63,94,0.3)] p-6 md:p-8 flex flex-col justify-between overflow-hidden">
                   {/* Background chart mockup */}
                   <div className="absolute left-0 bottom-0 w-full h-[60%] opacity-20 pointer-events-none">
                     <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full text-rose-500 fill-current"><path d="M0,50 L0,40 Q25,10 50,30 T100,5 L100,50 Z"></path></svg>
                   </div>
                   
                   <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
                     <div className="flex items-center gap-2 text-white font-bold"><ShieldCheck className="text-rose-500"/> Protection Node</div>
                     <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-1.5 rounded-md uppercase tracking-wider">Active</span>
                   </div>
                   
                   <div className="relative z-10 flex flex-col gap-5">
                     <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-lg transform md:-rotate-2 hover:rotate-0 transition-transform">
                       <div className="flex justify-between items-center mb-2">
                         <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded">Limit 80%</span>
                         <Clock size={12} className="text-slate-500"/>
                       </div>
                       <p className="text-white text-sm font-bold mb-1">Limit Makanan Kritis!</p>
                       <p className="text-slate-400 text-xs leading-relaxed">Anda sudah menghabiskan Rp 800.000 dari budget Rp 1.000.000. Hati-hati jajan ya.</p>
                     </div>
                     <div className="bg-rose-500/10 backdrop-blur-md p-4 rounded-2xl border border-rose-500/40 shadow-xl transform md:translate-x-4 md:rotate-2 hover:translate-x-0 transition-transform">
                       <div className="flex justify-between items-center mb-2">
                         <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/20 px-2 py-1 rounded">Limit Reached</span>
                         <Clock size={12} className="text-rose-500/60"/>
                       </div>
                       <p className="text-white text-sm font-bold mb-1">Budget Hiburan Habis!</p>
                       <p className="text-rose-200/90 text-[11px] leading-relaxed">Total Rp 500.000 (100%) sudah keluar. FinChat akan membunyikan alarm jika berlanjut.</p>
                     </div>
                   </div>
                </div>
              </FadeIn>
            </div>
            
            {/* Right: Copy */}
            <div className="lg:w-[55%]">
              <FadeIn delay={200}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-rose-200/80 bg-rose-50 text-rose-600 text-xs font-bold uppercase tracking-widest mb-6 border-b-2">
                  <ShieldCheck size={14} /> Pengawal Kantong
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-[1.1]">
                  Cegah Kebocoran Berkat <br/><span className="text-rose-500">Pengingat Proaktif.</span>
                </h2>
                <p className="text-slate-500 text-lg md:text-xl leading-relaxed mb-8">
                  Tidak ada lagi kisah gaji habis sebelum tanggal tua. Buat alokasi batas maksimum per kategori, dan bot kami akan mengirim ping otomatis ke HP Anda sebelum kebablasan.
                </p>
                <div className="grid grid-cols-2 gap-6 bg-[#fafafa] p-6 rounded-3xl border border-slate-100">
                  <div>
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center mb-3 text-slate-700">
                      <BarChart3 size={18}/>
                    </div>
                    <h5 className="font-bold text-slate-800 mb-2 text-[15px]">Custom Budgeting</h5>
                    <p className="text-sm text-slate-500 leading-relaxed">Tetapkan target sesuka Anda untuk setiap kategori hidup yang vital.</p>
                  </div>
                  <div>
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center mb-3 text-slate-700">
                      <PieChart size={18}/>
                    </div>
                    <h5 className="font-bold text-slate-800 mb-2 text-[15px]">Export Fleksibel</h5>
                    <p className="text-sm text-slate-500 leading-relaxed">Unduh data pengeluaran PDF/Excel kapanpun dibutuhkan untuk diaudit secara manual.</p>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE 5: SECURITY */}
      <section className="py-28 bg-[#fafafa] border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <FadeIn>
            <div className="inline-block relative">
               <div className="absolute inset-0 bg-emerald-200 blur-xl rounded-full opacity-60"></div>
               <div className="w-20 h-20 relative bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-md border border-slate-200 hover:scale-110 transition-transform duration-500">
                 <ShieldCheck className="text-emerald-500" size={36} />
               </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6 tracking-tight">Keamanan Privasi Tingkat Bank.</h2>
            <p className="text-slate-500 text-lg md:text-xl mb-12 max-w-2xl mx-auto">Tidur lebih nyenyak. Kami membangun FinChat di atas infrastruktur dengan jaminan perlindungan privasi nomor satu.</p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm text-left hover:-translate-y-1 transition-transform">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4 border border-emerald-100"><Zap className="text-emerald-600" size={20}/></div>
                <p className="font-bold text-slate-900 mb-2 text-lg tracking-tight">Tanpa Rekening</p>
                <p className="text-sm text-slate-500 leading-relaxed">Kami tidak akan pernah menanyakan PIN, koneksi internet banking, atau password. Tidak ada risiko uang dicuri.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm text-left hover:-translate-y-1 transition-transform">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4 border border-emerald-100"><ShieldCheck className="text-emerald-600" size={20}/></div>
                <p className="font-bold text-slate-900 mb-2 text-lg tracking-tight">E2E Enkripsi Telegram</p>
                <p className="text-sm text-slate-500 leading-relaxed">Mekanisme log-in hanya menggunakan ekosistem bot internal yang terenkripsi dan langsung terikat pada ID Anda.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm text-left hover:-translate-y-1 transition-transform">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4 border border-emerald-100"><MessageSquare className="text-emerald-600" size={20}/></div>
                <p className="font-bold text-slate-900 mb-2 text-lg tracking-tight">Akses Transparansi</p>
                <p className="text-sm text-slate-500 leading-relaxed">Datamu, hakmu. Transaksi dievaluasi oleh LLM sesaat dengan *zero-retention policy*. Tidak ada iklan, tidak dijual ke pihak ketiga.</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* PRICING TEASER (FREEMIUM) */}
      <section className="py-32 bg-white relative overflow-hidden">
        {/* Background mesh */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[400px] bg-gradient-to-b from-slate-100/80 to-transparent blur-3xl pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-6 sm:px-8 relative z-10">
          <FadeIn className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Mulai Gratis. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-rose-400">Upscale Kapan Saja.</span></h2>
            <p className="text-slate-500 text-lg md:text-xl">Buat jejak finansial pertamamu sekarang tanpa risiko apapun.</p>
          </FadeIn>

          <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
            {/* Free */}
            <FadeIn>
              <div className="bg-white border text-slate-900 border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col hover:-translate-y-1">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 bg-slate-100 w-fit px-3 py-1.5 rounded-md">Coba-coba</div>
                <h3 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Rp 0</h3>
                <p className="text-slate-500 text-[15px] mb-8 border-b border-slate-100 pb-8 leading-relaxed">Langkah kecil catat manual via AI bot. Cocok buat yang baru pengen coba.</p>
                <ul className="space-y-4 mb-10 text-[14px] font-semibold text-slate-700 flex-1">
                  <li className="flex gap-3.5 items-start"><CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20}/> <span>50 Transaksi Gratis di Telegram</span></li>
                  <li className="flex gap-3.5 items-start"><CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20}/> <span>Akses Web Dashboard Basic</span></li>
                  <li className="flex gap-3.5 items-start"><CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20}/> <span>9 Kategori Default Bawaan</span></li>
                  <li className="flex gap-3.5 items-start opacity-40 grayscale"><CheckCircle2 className="text-slate-400 shrink-0 mt-0.5" size={20}/> <span>Tanpa Custom Kategori</span></li>
                </ul>
                <div className="mt-auto">
                  <a href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'finchatme_bot'}`} target="_blank" rel="noopener noreferrer" className="block w-full py-4 text-center rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all shadow-md active:scale-95">
                    Daftar Akun Gratis
                  </a>
                </div>
              </div>
            </FadeIn>
            
            {/* Pro */}
            <FadeIn delay={200}>
              <div className="bg-[#0a0f1d] border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-indigo-900/20 relative overflow-hidden h-full flex flex-col hover:-translate-y-1 transition-transform duration-300 md:scale-105 z-10">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-indigo-500/20 via-[#0a0f1d]/5 to-transparent blur-3xl pointer-events-none rounded-full transition-transform duration-700"></div>
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/20 w-fit px-3 py-1.5 rounded-md">Pro Series</div>
                    <div className="bg-indigo-500 text-white text-[9px] font-black tracking-widest px-3 py-1.5 rounded-full uppercase shadow-md shadow-indigo-500/30">Most Popular</div>
                  </div>
                  <h3 className="text-4xl font-black text-white mb-3 tracking-tight">Rp 29k <span className="text-xl text-slate-500 font-bold tracking-normal">/bln</span></h3>
                  <p className="text-slate-400 text-[15px] mb-8 border-b border-slate-800 pb-8 leading-relaxed">Buka kunci kemampuan mutlak penganggaran, tanpa kompromi.</p>
                  <ul className="space-y-4 mb-10 text-[14px] font-semibold text-slate-300 flex-1">
                    <li className="flex gap-3.5 items-start"><CheckCircle2 className="text-indigo-400 shrink-0 mt-0.5" size={20}/> <span><b>Unlimited</b> Pencatatan Transaksi</span></li>
                    <li className="flex gap-3.5 items-start"><CheckCircle2 className="text-indigo-400 shrink-0 mt-0.5" size={20}/> <span>Notifikasi <b>Proactive Budget Alert</b></span></li>
                    <li className="flex gap-3.5 items-start"><CheckCircle2 className="text-indigo-400 shrink-0 mt-0.5" size={20}/> <span>Download Laporan <b>PDF & Excel</b></span></li>
                    <li className="flex gap-3.5 items-start"><CheckCircle2 className="text-indigo-400 shrink-0 mt-0.5" size={20}/> <span><b>10 Custom</b> Analytics Kategori</span></li>
                  </ul>
                  <div className="mt-auto">
                    <Link href="/pricing" className="block w-full py-4 text-center rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/30 active:scale-95 border-b-4 border-indigo-700 hover:border-indigo-600">
                      Bandingkan Paket
                    </Link>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Premium */}
            <FadeIn delay={400}>
              <div className="bg-white border text-slate-900 border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col hover:-translate-y-1">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 bg-slate-100 w-fit px-3 py-1.5 rounded-md">Ultimate</div>
                <h3 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Rp 59k <span className="text-xl text-slate-500 font-bold tracking-normal">/bln</span></h3>
                <p className="text-slate-500 text-[15px] mb-8 border-b border-slate-100 pb-8 leading-relaxed">Ditujukan untuk usahawan mikro, freelancer, & kebutuhan tanpa batas.</p>
                <ul className="space-y-4 mb-10 text-[14px] font-semibold text-slate-700 flex-1">
                  <li className="flex gap-3.5 items-start"><CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20}/> <span>Semua Fitur di Paket <b>Pro</b></span></li>
                  <li className="flex gap-3.5 items-start"><CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20}/> <span><b>Unlimited</b> Kategori Analytics</span></li>
                  <li className="flex gap-3.5 items-start"><CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20}/> <span>Riwayat Data Permanen</span></li>
                  <li className="flex gap-3.5 items-start"><CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20}/> <span>Prioritas Support 24/7</span></li>
                </ul>
                <div className="mt-auto">
                  <Link href="/pricing" className="block w-full py-4 text-center rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-all shadow-sm active:scale-95">
                    Lihat Paket Premium
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION BOTTOM */}
      <section className="py-24 md:py-32 relative overflow-hidden bg-white border-t border-slate-100">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
        <FadeIn className="max-w-4xl mx-auto px-6 sm:px-8 text-center text-slate-900 relative z-10">
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-[1.05]">Siap Menuju Kemerdekaan <br className="hidden md:block"/> <span className="text-indigo-600 relative inline-block">Finansial?<div className="absolute bottom-1 left-0 w-full h-3 bg-indigo-200/50 -z-10 rounded"></div></span></h2>
          <p className="text-slate-500 mb-10 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">Ribuan transaksi tersembunyi karena rasa malas mencatat. Stop pola beracun ini sekarang juga dengan platform teringan di Indonesia.</p>
          <a
            href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'finchatme_bot'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-slate-900 text-white text-[15px] font-bold rounded-2xl transition-all hover:-translate-y-1 hover:shadow-xl hover:bg-slate-800 active:scale-95"
          >
            Mulai Uji Coba Gratis <ArrowRight size={16} />
          </a>
        </FadeIn>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <FadeIn className="max-w-3xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Pertanyaan Populer</h2>
          </div>

          <div className="space-y-2">
            <FAQItem 
              question="Di mana letak keamanan data saya?" 
              answer="Data transaksi Anda disamarkan dengan ID unik dan tidak pernah diperjualbelikan. Telegram API memfasilitasi jalur komunikasi yang dienskripsi secara default. Kata sandi atau data bank Anda tidak pernah kami minta." 
            />
            <FAQItem 
              question="Apakah kalau ganti nomor Telegram data hilang?" 
              answer="Data terikat pada ID Telegram yang bersifat statis. Jika Anda hanya mengganti nomor telepon di akun Telegram yang sama, data FinChat Anda tidak akan berubah. Namun jika Anda menghapus akun Telegram secara permanen, koneksi ke FinChat tidak bisa dipulihkan." 
            />
            <FAQItem 
              question="Apakah ini butuh instal Aplikasi Desktop/Mobile?" 
              answer="Sama sekali tidak. Semuanya berjalan 100% berbasis Cloud Web Dashboard dan Bot Server. Cukup gunakan browser di laptop atau HP." 
            />
            <FAQItem 
              question="Apa yang terjadi bila limit transaksi gratis habis?" 
              answer="Di paket awal (Free), saat Anda mencapai 50 transaksi dalam bulan tersebut, pesan pencatatan ke bot akan ditolak. Bulan depan (tanggal 1), kuota 50 di-reset kembali secara gratis." 
            />
          </div>
        </FadeIn>
      </section>

      {/* COMPREHENSIVE FOOTER */}
      <footer className="pt-16 pb-8 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4 max-w-fit cursor-pointer group">
                <div className="w-8 h-8 rounded-lg bg-white overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 border border-slate-100 shadow-sm">
                  <Image src="/finchat-logo.png" alt="FinChat Logo" width={32} height={32} className="w-full h-full object-cover" />
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">FinChat</span>
              </Link>
              <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-6">
                Redefinisi pengalaman pencatatan dana pribadi. Karena mengelola uang Anda seharusnya semudah *"Beli Kopi 25rb"*.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wider">Perusahaan</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><Link href="/blog" className="hover:text-slate-900">Blog Finansial</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Karir</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Media & Press</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wider">Produk</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><a href="#solusi" className="hover:text-slate-900">Integrasi Telegram</a></li>
                <li><a href="#solusi" className="hover:text-slate-900">Dashboard Web</a></li>
                <li><Link href="/pricing" className="hover:text-slate-900">Harga Paket</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Changelog</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wider">Legal & Bantuan</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><Link href="/terms" className="hover:text-slate-900">Syarat & Ketentuan</Link></li>
                <li><Link href="/privacy" className="hover:text-slate-900">Kebijakan Privasi</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Dokumentasi Bot</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Hubungi Support</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-100">
            <p className="text-slate-400 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} FinChat Personal Finance Co.
            </p>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="text-sm">Indonesia Raya</span>
              {process.env.NODE_ENV === 'development' && (
              <button
                onClick={async () => {
                  try {
                    await api.login(123456789, 'Demo User', 'demo_user');
                    router.push('/dashboard');
                  } catch (e) {
                    console.error("Demo login error", e);
                  }
                }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-900 transition-colors"
              >
                [Force Login Dev]
              </button>
            )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
