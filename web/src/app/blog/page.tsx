import Link from 'next/link';
import Image from 'next/image';
import { Send, ArrowRight, Clock, Tag } from 'lucide-react';
import type { Metadata } from 'next';
import NavbarPublic from '@/components/NavbarPublic';

export const metadata: Metadata = {
  title: 'Blog Keuangan — FinChat | Tips Atur Keuangan Pribadi',
  description: 'Tips dan panduan praktis mengelola keuangan pribadi untuk karyawan, freelancer, dan mahasiswa Indonesia. Belajar hemat, nabung, dan investasi.',
  keywords: ['tips keuangan', 'atur keuangan', 'nabung gaji', 'keuangan freelancer', 'tracking pengeluaran'],
};

const posts = [
  {
    slug: 'cara-atur-keuangan-gaji-pertama',
    category: 'Pemula',
    categoryColor: 'bg-emerald-100 text-emerald-700',
    title: 'Cara Atur Keuangan dari Gaji Pertama: Panduan untuk Fresh Graduate',
    excerpt: 'Gaji pertama terasa besar, tapi sering habis sebelum akhir bulan. Ikuti formula 50-30-20 dan cara mencatatnya dengan mudah lewat Telegram.',
    readTime: '5 menit',
    date: '10 April 2026',
    featured: true,
  },
  {
    slug: 'tips-nabung-mahasiswa',
    category: 'Mahasiswa',
    categoryColor: 'bg-blue-100 text-blue-700',
    title: '7 Tips Nabung Efektif untuk Mahasiswa dengan Uang Pas-pasan',
    excerpt: 'Uang bulanan dari orang tua atau beasiswa sering tidak cukup? Dengan strategi yang tepat dan habit tracking yang konsisten, Anda bisa nabung dari budget sekecil apapun.',
    readTime: '4 menit',
    date: '8 April 2026',
    featured: false,
  },
  {
    slug: 'keuangan-freelancer-pendapatan-tidak-tetap',
    category: 'Freelancer',
    categoryColor: 'bg-purple-100 text-purple-700',
    title: 'Manajemen Keuangan Freelancer: Cara Atur Pemasukan yang Tidak Tetap',
    excerpt: 'Sebagai freelancer, income bisa naik-turun drastis setiap bulan. Pelajari cara memisahkan pajak, operasional, dan tabungan meski pendapatan tidak menentu.',
    readTime: '6 menit',
    date: '5 April 2026',
    featured: false,
  },
  {
    slug: 'aplikasi-catat-keuangan-terbaik-indonesia',
    category: 'Review',
    categoryColor: 'bg-amber-100 text-amber-700',
    title: 'Perbandingan Aplikasi Catat Keuangan Terbaik di Indonesia 2026',
    excerpt: 'Dari Excel, MoneyManager, hingga chatbot AI — mana yang paling cocok untuk gaya hidup orang Indonesia? Kami bandingkan dari sisi kemudahan, fitur, dan harga.',
    readTime: '8 menit',
    date: '2 April 2026',
    featured: true,
  },
  {
    slug: 'budget-50-30-20-cara-kerja',
    category: 'Strategi',
    categoryColor: 'bg-indigo-100 text-indigo-700',
    title: 'Metode Budget 50/30/20: Cara Kerja dan Implementasinya',
    excerpt: 'Formula budgeting paling populer di dunia — bagaimana cara kerjanya dan bagaimana cara menerapkannya dengan mudah menggunakan kategori otomatis FinChat.',
    readTime: '5 menit',
    date: '28 Maret 2026',
    featured: false,
  },
  {
    slug: 'kebiasaan-buruk-keuangan',
    category: 'Mindset',
    categoryColor: 'bg-rose-100 text-rose-700',
    title: '6 Kebiasaan Buruk Keuangan yang Bikin Gaji Selalu Habis',
    excerpt: 'Lifestyle inflation, impulse buying, dan tidak mencatat keuangan — kebiasaan-kebiasaan ini silently menguras kantong Anda setiap bulan tanpa disadari.',
    readTime: '5 menit',
    date: '25 Maret 2026',
    featured: false,
  },
];

export default function BlogPage() {
  const featured = posts.filter(p => p.featured);
  const regular = posts.filter(p => !p.featured);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative overflow-hidden">
      {/* Background grain & mesh */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none z-0"></div>
      
      <NavbarPublic />

      {/* HERO */}
      <section className="pt-24 pb-20 relative overflow-hidden bg-white border-b border-slate-200/50">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-emerald-100/50 via-transparent to-transparent pointer-events-none blur-3xl z-0"></div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full shadow-sm">Blog FinChat</span>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 mt-6 mb-4 tracking-tight leading-[1.1]">
              Literasi Keuangan<br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-indigo-500">Orang Indonesia.</span>
            </h1>
            <p className="text-slate-500 text-lg md:text-xl leading-relaxed max-w-xl">
              Panduan nyata mengelola uang pribadi — dari cara membagi gaji pertama, hingga strategi investasi pemula.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURED POSTS */}
      <section className="py-20 max-w-6xl mx-auto px-6 relative z-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2"><div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div> Artikel Utama</h2>
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          {featured.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group bg-white border border-slate-200/80 rounded-[2rem] p-8 md:p-10 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-900/5 transition-all duration-500 flex flex-col hover:-translate-y-1 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-md shadow-sm ${post.categoryColor}`}>{post.category}</span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <Clock size={12} />
                  {post.readTime}
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors leading-[1.2] tracking-tight relative z-10">
                {post.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed flex-1 mb-5">{post.excerpt}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{post.date}</span>
                <span className="flex items-center gap-1 text-indigo-600 text-sm font-semibold group-hover:gap-2 transition-all">
                  Baca <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* ALL POSTS */}
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6">Semua Artikel</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {regular.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 hover:shadow-md transition-all duration-300 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${post.categoryColor}`}>{post.category}</span>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock size={12} />
                  {post.readTime}
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors leading-snug flex-1">
                {post.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs text-slate-400">{post.date}</span>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* NEWSLETTER / CTA SECTION */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 mb-4 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full text-xs font-semibold">
            <Tag size={12} />
            Coba FinChat Sekarang
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Teori saja tidak cukup — praktikkan langsung!
          </h2>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed max-w-lg mx-auto">
            Terapkan semua tips di artikel ini dengan FinChat. Catat pengeluaran langsung dari Telegram dalam hitungan detik, lalu pantau perkembangan di dashboard.
          </p>
          <a
            href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'finchatme_bot'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-slate-900 text-white font-semibold rounded-full hover:bg-slate-700 transition-colors text-sm"
          >
            <Send size={15} />
            Mulai Gratis via Telegram
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-400">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/Logo2finchat.webp" alt="FinChat Logo" className="w-[100px] h-[32px] md:w-[120px] md:h-[36px] object-cover object-center rounded-md" />
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="hover:text-slate-700 transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-slate-700 transition-colors">Privasi</Link>
            <Link href="/terms" className="hover:text-slate-700 transition-colors">Syarat</Link>
          </div>
          <p>© {new Date().getFullYear()} FinChat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
