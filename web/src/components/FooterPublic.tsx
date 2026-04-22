'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

interface FooterPublicProps {
  showCTA?: boolean;
}

export default function FooterPublic({ showCTA = true }: FooterPublicProps) {
  const router = useRouter();
  
  return (
    <>
      {/* CALL TO ACTION BOTTOM */}
      {showCTA && (
      <section className="py-24 md:py-32 relative overflow-hidden bg-white border-t border-slate-100">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center text-slate-900 relative z-10">
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-[1.05]">Siap Menuju Kemerdekaan <br className="hidden md:block"/> <span className="text-indigo-600 relative inline-block">Finansial?<div className="absolute bottom-1 left-0 w-full h-3 bg-indigo-200/50 -z-10 rounded"></div></span></h2>
          <p className="text-slate-500 mb-10 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">Ribuan transaksi tersembunyi karena rasa malas mencatat. Stop pola beracun ini sekarang juga dengan platform teringan di Indonesia.</p>
          <a
            href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'your_bot_username'}?start=auth`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-slate-900 text-white text-[15px] font-bold rounded-2xl transition-all hover:-translate-y-1 hover:shadow-xl hover:bg-slate-800 active:scale-95"
          >
            Mulai Uji Coba Gratis <ArrowRight size={16} />
          </a>
        </div>
      </section>
      )}

      {/* COMPREHENSIVE FOOTER */}
      <footer className="pt-16 pb-8 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
            <div className="col-span-2">
              <Link href="/" className="flex items-center mb-5 max-w-fit cursor-pointer group">
                <div className="flex items-center justify-center transition-transform group-hover:scale-105">
                  <img src="/Logofinchat-transparent.png" alt="FinChat Logo" className="h-7 md:h-8 w-auto object-contain" />
                </div>
              </Link>
              <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-6">
                Redefinisi pengalaman pencatatan dana pribadi. Karena mengelola uang Anda seharusnya semudah *"Beli Kopi 25rb"*.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wider">Perusahaan</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><Link href="#" className="hover:text-slate-900">Karir</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Media & Press</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wider">Produk</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><a href="/#solusi" className="hover:text-slate-900">Integrasi Telegram</a></li>
                <li><a href="/#solusi" className="hover:text-slate-900">Dashboard Web</a></li>
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
    </>
  );
}
