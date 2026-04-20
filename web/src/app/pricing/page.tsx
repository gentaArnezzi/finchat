'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import NavbarPublic from '@/components/NavbarPublic';
import FooterPublic from '@/components/FooterPublic';
import {
  Check, X, Zap, ShieldCheck, Send, ArrowRight,
  HelpCircle, ChevronDown, Star, Sparkles, CheckCircle2
} from 'lucide-react';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceAnnual: 0,
    badge: null,
    description: 'Cocok untuk yang baru mulai tracking keuangan',
    cta: 'Mulai Gratis',
    ctaHref: `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'finchatme_bot'}`,
    ctaExternal: true,
    highlight: false,
    features: [
      { text: '50 transaksi per bulan', included: true },
      { text: 'Web dashboard basic', included: true },
      { text: 'Riwayat 3 bulan', included: true },
      { text: 'Kategori default (9 kategori)', included: true },
      { text: 'Notifikasi basic', included: true },
      { text: 'Grafik & analisis lengkap', included: false },
      { text: 'Budget management', included: false },
      { text: 'Export PDF / Excel', included: false },
      { text: 'Kategori custom', included: false },
      { text: 'Riwayat 12 bulan', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 14900,
    priceAnnual: 10000,
    badge: 'Paling Populer',
    description: 'Untuk yang serius kelola keuangan setiap bulan',
    cta: 'Mulai Pro Sekarang',
    ctaHref: '/dashboard/upgrade',
    ctaExternal: false,
    highlight: true,
    features: [
      { text: 'Transaksi unlimited', included: true },
      { text: 'Web dashboard lengkap', included: true },
      { text: 'Riwayat 12 bulan', included: true },
      { text: 'Semua grafik & analisis', included: true },
      { text: 'Budget management per kategori', included: true },
      { text: 'Export laporan PDF & Excel', included: true },
      { text: '10 kategori custom', included: true },
      { text: 'Alert budget 80% & 100%', included: true },
      { text: 'Ringkasan mingguan & bulanan', included: true },
      { text: 'Prioritas support', included: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 29900,
    priceAnnual: 25000,
    badge: null,
    description: 'Untuk freelancer & usaha kecil yang butuh lebih',
    cta: 'Mulai Business',
    ctaHref: '/dashboard/upgrade',
    ctaExternal: false,
    highlight: false,
    features: [
      { text: 'Transaksi unlimited', included: true },
      { text: 'Web dashboard lengkap', included: true },
      { text: 'Riwayat data unlimited', included: true },
      { text: 'Semua grafik & analisis', included: true },
      { text: 'Budget management per kategori', included: true },
      { text: 'Export laporan PDF & Excel', included: true },
      { text: 'Kategori custom unlimited', included: true },
      { text: 'Alert budget 80% & 100%', included: true },
      { text: 'Ringkasan mingguan & bulanan', included: true },
      { text: 'Prioritas support', included: true },
    ],
  },
];

const faqs = [
  {
    q: 'Apakah ada biaya tersembunyi?',
    a: 'Tidak sama sekali. Harga yang tertera adalah harga final — tidak ada setup fee, tidak ada biaya tambahan. Anda hanya bayar sesuai plan yang dipilih.',
  },
  {
    q: 'Bagaimana cara upgrade ke Pro atau Business?',
    a: 'Login ke dashboard FinChat, buka menu "Upgrade Plan", pilih plan, lalu lakukan pembayaran via Midtrans. Setelah pembayaran berhasil dikonfirmasi, plan langsung aktif otomatis.',
  },
  {
    q: 'Metode pembayaran apa saja yang tersedia?',
    a: 'Kami mendukung transfer bank (semua bank besar), e-wallet (GoPay, OVO, DANA, ShopeePay), kartu kredit/debit, QRIS, dan pembayaran di minimarket (Indomaret, Alfamart).',
  },
  {
    q: 'Bisakah downgrade kembali ke Free?',
    a: 'Plan berbayar bersifat bulanan. Setelah masa aktif berakhir, akun otomatis kembali ke plan Free. Tidak perlu cancel manual — tidak ada kontrak jangka panjang.',
  },
  {
    q: 'Apakah data saya aman?',
    a: 'Ya. Data Anda dienkripsi dan hanya terikat pada ID Telegram Anda. Kami tidak pernah meminta password, PIN, atau informasi rekening bank. Komunikasi menggunakan HTTPS end-to-end.',
  },
  {
    q: 'Apa yang terjadi dengan data saya jika tidak perpanjang?',
    a: 'Jika kembali ke Free, data transaksi Anda tetap aman. Anda hanya bisa mengakses riwayat 3 bulan terakhir. Jika upgrade lagi, seluruh riwayat dapat diakses kembali.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-5 text-left gap-4 focus:outline-none group"
      >
        <span className="font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-48 pb-5' : 'max-h-0'}`}>
        <p className="text-slate-500 text-sm leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  const formatRp = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative overflow-hidden">
      {/* Background grain & mesh */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none z-0"></div>
      <div className="absolute top-[-10%] sm:max-md:left-[-10%] md:left-1/2 md:-translate-x-1/2 w-full max-w-[1200px] h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/60 via-transparent to-transparent pointer-events-none blur-3xl z-0"></div>

      <NavbarPublic />

      {/* HERO */}
      <section className="pt-24 pb-16 text-center px-6 relative z-10">

        <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
          Investasi Kecil, <br className="hidden sm:block" /> <span className="text-[#a2c828]">Dampak Eksponensial.</span>
        </h1>
        <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
          Tidak ada kontrak rumit. Tidak ada biaya jebakan. <i>Cancel</i> kapan pun tanpa pinalti. Kebebasan finansial ada di tangan Anda.
        </p>

        {/* Toggle Monthly / Annual */}
        <div className="inline-flex items-center gap-3 p-1 rounded-full bg-slate-100 border border-slate-200">
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Bulanan
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Tahunan
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">Hemat 17%</span>
          </button>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section className="max-w-6xl mx-auto px-6 pb-32 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-[2.5rem] p-8 md:p-10 flex flex-col transition-all duration-500 h-full ${
                plan.highlight
                  ? 'bg-[#0a0f1d] text-white shadow-2xl shadow-indigo-900/20 md:scale-105 border border-slate-800'
                  : 'bg-white border text-slate-900 border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 hover:-translate-y-1'
              }`}
            >
              {plan.highlight && (
                 <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-indigo-500/20 via-[#0a0f1d]/0 to-transparent blur-3xl pointer-events-none rounded-full"></div>
              )}
              {/* Header Badge */}
              <div className="flex justify-between items-center mb-6 relative z-10 w-full">
                <div className={`text-[10px] font-black uppercase tracking-widest w-fit px-3 py-1.5 rounded-md ${plan.highlight ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-100 text-slate-400'}`}>
                   {plan.id === 'free' ? 'Coba-Coba' : (plan.id === 'pro' ? 'Pro Series' : 'Business')}
                </div>
                {plan.badge && (
                  <div className="bg-indigo-500 text-white text-[9px] font-black tracking-widest px-3 py-1.5 rounded-full uppercase shadow-md shadow-indigo-500/30">
                    {plan.badge}
                  </div>
                )}
              </div>

              {/* Price & Name */}
              <div className="mb-8 relative z-10">
                <h2 className={`text-4xl font-black tracking-tight mb-2 ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                  {plan.price === 0 ? 'Rp 0' : (
                     <>
                        {formatRp(annual ? plan.priceAnnual : plan.price)}
                        <span className="text-xl text-slate-500 font-bold tracking-normal ml-1">/bln</span>
                     </>
                  )}
                </h2>
                
                {annual && plan.price > 0 && (
                  <p className="text-xs text-emerald-500 font-bold mt-1">
                    Ditagih {formatRp((annual ? plan.priceAnnual : plan.price) * 12)}/tahun
                  </p>
                )}
                <p className={`text-[15px] mt-4 pb-8 border-b leading-relaxed ${plan.highlight ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-100'}`}>
                  {plan.description}
                </p>
              </div>

              {/* CTA Button */}
              <div className="relative z-10 w-full mt-auto mb-8">
                {plan.ctaExternal ? (
                  <a
                    href={plan.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full py-4 rounded-2xl text-center text-sm font-bold transition-colors active:scale-95 shadow-sm ${
                      plan.highlight
                        ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <Link
                    href={plan.ctaHref}
                    className={`block w-full py-4 rounded-2xl text-center text-sm font-bold transition-all active:scale-95 shadow-sm ${
                      plan.highlight
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 border-b-4 border-indigo-700 hover:border-indigo-600'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>

              {/* Features Loop */}
              <div className="relative z-10 flex-1 flex flex-col pt-2">
                <ul className="space-y-4 mb-10 text-[14px] font-semibold flex-1">
                  {plan.features.map((feat, i) => (
                    <li key={i} className={`flex items-start gap-3.5 ${!feat.included ? (plan.highlight ? 'opacity-30' : 'opacity-40 grayscale') : (plan.highlight ? 'text-slate-300' : 'text-slate-700')}`}>
                      {feat.included ? (
                        <CheckCircle2 size={20} className={`shrink-0 mt-0.5 ${plan.highlight ? 'text-indigo-400' : 'text-emerald-500'}`} />
                      ) : (
                        <CheckCircle2 size={20} className={`shrink-0 mt-0.5 ${plan.highlight ? 'text-slate-600' : 'text-slate-400'}`} />
                      )}
                      <span>{feat.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Guarantee Badge */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-500" />
            <span>Garansi uang kembali 7 hari untuk Pro & Business</span>
          </div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300" />
          <div className="flex items-center gap-2">
            <Star size={16} className="text-amber-400 fill-amber-400" />
            <span>Lebih dari 1.000 pengguna aktif</span>
          </div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300" />
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-indigo-500" />
            <span>Aktif instan setelah pembayaran</span>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">FinChat vs Cara Lama</h2>
          <div className="rounded-2xl overflow-hidden shadow-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left py-4 px-6 font-bold text-white">Fitur</th>
                  <th className="text-center py-4 px-4 text-slate-300 font-medium">Excel / Buku</th>
                  <th className="text-center py-4 px-4 text-slate-300 font-medium">App Lain</th>
                  <th className="text-center py-4 px-4 font-bold text-slate-900 bg-[#a2c828]">FinChat</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Kecepatan input', '😫 Manual', '⚡ 5-7 klik', '✅ 5 detik chat'],
                  ['Tidak perlu install app', '✅', '❌', '✅'],
                  ['AI auto-kategorisasi', '❌', '❌', '✅'],
                  ['Notifikasi budget', '❌', '⚠️ Kadang', '✅ Otomatis'],
                  ['Bisa chat natural', '❌', '❌', '✅ Bahasa Indonesia'],
                  ['Harga dasar', 'Gratis', 'Rp50–150rb/bln', '✅ Gratis'],
                ].map(([label, a, b, c], i) => (
                  <tr key={i} className={`border-b border-slate-800 last:border-0 ${i % 2 === 0 ? 'bg-slate-800' : 'bg-slate-900'}`}>
                    <td className="py-4 px-6 font-medium text-slate-200">{label}</td>
                    <td className="py-4 px-4 text-center text-slate-400">{a}</td>
                    <td className="py-4 px-4 text-center text-slate-400">{b}</td>
                    <td className="py-4 px-4 text-center font-bold text-[#a2c828]">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 max-w-3xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2 bg-slate-100 rounded-lg">
            <HelpCircle size={20} className="text-slate-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Pertanyaan Umum</h2>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-8">
          {faqs.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      <FooterPublic />
    </div>
  );
}
