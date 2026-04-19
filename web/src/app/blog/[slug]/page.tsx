import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Clock, Tag, Send, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import NavbarPublic from '@/components/NavbarPublic';

// In a real app, this would come from a CMS or MDX
const articles: Record<string, any> = {
  'cara-atur-keuangan-gaji-pertama': {
    title: 'Cara Atur Keuangan dari Gaji Pertama: Panduan untuk Fresh Graduate',
    category: 'Pemula',
    categoryColor: 'bg-emerald-100 text-emerald-700',
    readTime: '5 menit',
    date: '10 April 2026',
    description: 'Gaji pertama terasa besar, tapi sering habis sebelum akhir bulan. Ikuti formula 50-30-20 dan cara mencatatnya dengan mudah.',
    content: [
      {
        type: 'intro',
        text: 'Gaji pertama itu memang euforianya luar biasa. Tapi bagi banyak fresh graduate, euforia itu sering berakhir dengan keheranan: "Kok udah habis aja ya?" Padahal bulan baru mulai dua minggu lalu.',
      },
      {
        type: 'heading',
        text: 'Kenapa Gaji Selalu Habis?',
      },
      {
        type: 'paragraph',
        text: 'Masalah utamanya bukan jumlah gajinya — tapi tidak ada sistem. Ketika tidak ada sistem pencatatan, pengeluaran kecil-kecil seperti kopi, ojek online, dan makan siang terasa tidak signifikan. Padahal jika dijumlah, bisa mencapai 30–40% dari gaji.',
      },
      {
        type: 'heading',
        text: 'Formula 50/30/20: Aturan Paling Sederhana',
      },
      {
        type: 'paragraph',
        text: 'Formula 50/30/20 adalah cara paling mudah untuk mulai mengatur keuangan tanpa perlu jadi ahli finansial:',
      },
      {
        type: 'list',
        items: [
          { strong: '50% untuk Kebutuhan:', text: 'Kos/kontrakan, makan, transportasi ke kantor, tagihan listrik & internet.' },
          { strong: '30% untuk Keinginan:', text: 'Nongkrong, streaming, belanja pakaian, hiburan — semua yang "nice to have".' },
          { strong: '20% untuk Tabungan & Investasi:', text: 'Rekening tabungan, reksa dana, atau dana darurat. Transfer ini duluan sebelum yang lain.' },
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: '💡 Tip Pro: Transfer 20% ke tabungan di hari yang sama dengan hari gajian. Jangan tunggu "sisanya" — karena biasanya tidak ada sisa.',
      },
      {
        type: 'heading',
        text: 'Langkah Pertama: Mulai Catat SEMUA Pengeluaran',
      },
      {
        type: 'paragraph',
        text: 'Tidak bisa mengatur apa yang tidak kamu ukur. Pencatatan keuangan adalah fondasi segalanya. Dan inilah tempat banyak orang gagal — bukan karena tidak mau, tapi karena aplikasinya terlalu ribet untuk dipakai setiap hari.',
      },
      {
        type: 'paragraph',
        text: 'Dengan FinChat, kamu cukup kirim pesan ke Telegram seperti ini:',
      },
      {
        type: 'chat',
        messages: [
          { from: 'user', text: 'Makan siang di warteg 18rb' },
          { from: 'bot', text: '✅ Makanan & Minuman — Rp18.000 dicatat!\nTotal pengeluaran hari ini: Rp67.000' },
          { from: 'user', text: 'Ojek ke kantor 12rb' },
          { from: 'bot', text: '✅ Transportasi — Rp12.000 dicatat!\nSisa budget Transportasi bulan ini: Rp288.000' },
        ],
      },
      {
        type: 'heading',
        text: 'Plan Aksi untuk Bulan Pertama',
      },
      {
        type: 'numbered',
        items: [
          'Tentukan angka konkret untuk setiap kategori 50/30/20 berdasarkan gajimu',
          'Transfer tabungan di hari gajian sebelum mulai belanja apapun',
          'Catat SETIAP transaksi — sekecil apapun, termasuk parkir Rp2.000',
          'Review di akhir minggu: kategori mana yang paling banyak "bocor"?',
          'Adjust budget jika ada yang tidak realistis — tidak apa-apa, ini proses',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: '⚠️ Jangan perfeksionis di awal. Lebih baik catat 80% transaksi secara konsisten daripada catat 100% selama seminggu lalu berhenti karena terlalu ribet.',
      },
      {
        type: 'heading',
        text: 'Kesimpulan',
      },
      {
        type: 'paragraph',
        text: 'Gaji pertama adalah momentum terbaik untuk membangun kebiasaan finansial yang benar. Kebiasaan yang kamu bangun sekarang akan sangat menentukan kondisi keuanganmu 5–10 tahun ke depan. Mulai sederhana, mulai konsisten, dan biarkan sistem bekerja untukmu.',
      },
    ],
    relatedPosts: [
      { slug: 'budget-50-30-20-cara-kerja', title: 'Metode Budget 50/30/20: Cara Kerja dan Implementasinya', category: 'Strategi' },
      { slug: 'kebiasaan-buruk-keuangan', title: '6 Kebiasaan Buruk Keuangan yang Bikin Gaji Selalu Habis', category: 'Mindset' },
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) return { title: 'Artikel tidak ditemukan — FinChat' };
  return {
    title: `${article.title} — FinChat Blog`,
    description: article.description,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles[slug];

  if (!article) {
    return (
      <div className="min-h-screen bg-[#fafafa] font-sans flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">📄</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Artikel Tidak Ditemukan</h1>
          <p className="text-slate-500 mb-6">Artikel yang kamu cari belum tersedia atau sudah dipindahkan.</p>
          <Link href="/blog" className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:underline">
            <ArrowLeft size={16} /> Kembali ke Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-slate-800">
      <NavbarPublic />

      {/* ARTICLE */}
      <main className="max-w-3xl mx-auto px-6 py-14">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${article.categoryColor}`}>
              {article.category}
            </span>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock size={12} />
              {article.readTime} baca
            </div>
            <span className="text-xs text-slate-400">{article.date}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
            {article.title}
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed">{article.description}</p>
          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-slate-700 flex items-center justify-center text-white text-sm font-bold">F</div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Tim Editorial FinChat</p>
              <p className="text-xs text-slate-400">Keuangan Pribadi · Indonesia</p>
            </div>
          </div>
        </div>

        {/* Content Renderer */}
        <article className="space-y-6 text-slate-600 leading-relaxed">
          {article.content.map((block: any, i: number) => {
            if (block.type === 'intro') {
              return <p key={i} className="text-lg text-slate-700 leading-relaxed font-medium">{block.text}</p>;
            }
            if (block.type === 'heading') {
              return <h2 key={i} className="text-xl font-bold text-slate-900 mt-10 mb-2">{block.text}</h2>;
            }
            if (block.type === 'paragraph') {
              return <p key={i} className="text-slate-600">{block.text}</p>;
            }
            if (block.type === 'list') {
              return (
                <ul key={i} className="space-y-3">
                  {block.items.map((item: any, j: number) => (
                    <li key={j} className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-4 text-sm">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{j + 1}</span>
                      <span><strong className="text-slate-800">{item.strong}</strong> {item.text}</span>
                    </li>
                  ))}
                </ul>
              );
            }
            if (block.type === 'numbered') {
              return (
                <ol key={i} className="space-y-3">
                  {block.items.map((item: string, j: number) => (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{j + 1}</span>
                      <span className="text-slate-600">{item}</span>
                    </li>
                  ))}
                </ol>
              );
            }
            if (block.type === 'callout') {
              const isWarning = block.variant === 'warning';
              return (
                <div key={i} className={`rounded-xl p-5 text-sm leading-relaxed ${isWarning ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-indigo-50 border border-indigo-100 text-indigo-800'}`}>
                  {block.text}
                </div>
              );
            }
            if (block.type === 'chat') {
              return (
                <div key={i} className="bg-[#f0f2f5] rounded-2xl p-5 space-y-3 border border-slate-200">
                  <p className="text-xs font-semibold text-center text-slate-400 mb-2 uppercase tracking-wider">Contoh Percakapan</p>
                  {block.messages.map((msg: any, j: number) => (
                    <div key={j} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${msg.from === 'user' ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-sm' : 'bg-white shadow-sm text-slate-700 rounded-tl-sm'}`}>
                        {msg.text.split('\n').map((line: string, k: number) => (
                          <span key={k}>{line}{k < msg.text.split('\n').length - 1 && <br />}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          })}
        </article>

        {/* CTA Box */}
        <div className="mt-14 bg-gradient-to-br from-indigo-600 to-slate-900 rounded-2xl p-8 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
          <div className="relative z-10">
            <p className="text-indigo-200 text-sm mb-2 font-medium">Sudah siap memulai?</p>
            <h3 className="text-2xl font-bold mb-3">Terapkan Tips Ini dengan FinChat</h3>
            <p className="text-indigo-200 text-sm mb-6 max-w-sm mx-auto">Catat keuangan langsung dari Telegram. Gratis untuk 50 transaksi pertama setiap bulan.</p>
            <a
              href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'finchatme_bot'}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-slate-900 font-bold rounded-full hover:scale-105 transition-transform text-sm shadow-xl"
            >
              <Send size={15} /> Mulai Gratis via Telegram
            </a>
          </div>
        </div>

        {/* Related Posts */}
        {article.relatedPosts && (
          <div className="mt-14">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-5">Artikel Terkait</h3>
            <div className="space-y-3">
              {article.relatedPosts.map((related: any) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group"
                >
                  <div>
                    <span className="text-xs text-slate-400 mb-1 block">{related.category}</span>
                    <p className="font-semibold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{related.title}</p>
                  </div>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0 ml-4" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back to blog */}
        <div className="mt-10 pt-10 border-t border-slate-200">
          <Link href="/blog" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
            <ArrowLeft size={16} />
            Lihat semua artikel
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-400">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/Logo2finchat.webp" alt="FinChat Logo" className="w-[100px] h-[32px] md:w-[120px] md:h-[36px] object-cover object-center rounded-md" />
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="hover:text-slate-700 transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-slate-700 transition-colors">Privasi</Link>
            <Link href="/terms" className="hover:text-slate-700 transition-colors">Syarat</Link>
          </div>
          <p>© {new Date().getFullYear()} FinChat</p>
        </div>
      </footer>
    </div>
  );
}
