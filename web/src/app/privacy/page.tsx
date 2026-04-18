import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi — FinChat',
  description: 'Kebijakan privasi FinChat menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-slate-800">
      {/* NAV */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm">
            <ArrowLeft size={16} />
            Kembali ke FinChat
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <Link href="/" className="flex items-center gap-2">
            <Image src="/finchat-logo.png" alt="FinChat" width={24} height={24} className="rounded" />
            <span className="font-bold text-slate-900 text-sm">FinChat</span>
          </Link>
        </div>
      </header>

      {/* CONTENT */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Legal</span>
          <h1 className="text-4xl font-bold text-slate-900 mt-4 mb-2">Kebijakan Privasi</h1>
          <p className="text-slate-500 text-sm">Terakhir diperbarui: April 2026 · Versi 1.0</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-10 text-slate-600 leading-relaxed">

          <section>
            <p className="text-lg text-slate-700 leading-relaxed">
              FinChat ("kami", "layanan kami") berkomitmen untuk melindungi privasi Anda. Kebijakan ini menjelaskan jenis data yang kami kumpulkan, bagaimana kami menggunakannya, dan hak-hak Anda sebagai pengguna.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. Data yang Kami Kumpulkan</h2>
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-2">1.1 Data Akun Telegram</h3>
                <p className="text-sm text-slate-500">Saat Anda login menggunakan Telegram, kami menerima: ID Telegram (unik), nama lengkap, dan username (jika tersedia). Kami <strong>tidak</strong> menerima password, nomor telepon, atau kontak Telegram Anda.</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-2">1.2 Data Transaksi Keuangan</h3>
                <p className="text-sm text-slate-500">Data yang Anda masukkan sendiri: nominal transaksi, kategori, deskripsi, dan tanggal. Kami tidak terintegrasi dengan rekening bank atau e-wallet Anda secara langsung.</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-2">1.3 Data Preferensi</h3>
                <p className="text-sm text-slate-500">Zona waktu, mata uang pilihan, dan pengaturan notifikasi yang Anda konfigurasi di dalam aplikasi.</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-2">1.4 Data Teknis</h3>
                <p className="text-sm text-slate-500">Log akses, waktu login, dan alamat IP untuk keperluan keamanan dan debugging. Data ini dihapus otomatis setelah 90 hari.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">2. Bagaimana Kami Menggunakan Data</h2>
            <ul className="space-y-3 text-sm">
              {[
                'Menampilkan dashboard dan laporan keuangan sesuai data yang Anda masukkan',
                'Mengirimkan notifikasi dan reminder yang Anda aktifkan',
                'Memproses pembayaran subscription melalui Midtrans (gateway pihak ketiga)',
                'Meningkatkan akurasi parsing AI berdasarkan pola penggunaan (data dianonimkan)',
                'Mendeteksi dan mencegah aktivitas tidak sah di akun Anda',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 bg-white rounded-lg border border-slate-100 p-3.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">3. Data yang Tidak Kami Lakukan</h2>
            <div className="bg-red-50 border border-red-100 rounded-xl p-5 space-y-2.5">
              {[
                'Kami TIDAK menjual data Anda kepada pihak ketiga manapun',
                'Kami TIDAK mengakses percakapan Telegram Anda di luar interaksi dengan bot FinChat',
                'Kami TIDAK menyimpan informasi rekening bank, PIN, atau password apapun',
                'Kami TIDAK menampilkan iklan berbasis profil data keuangan Anda',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-red-700">
                  <span className="text-red-500 mt-0.5">✕</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">4. Keamanan Data</h2>
            <p className="text-sm text-slate-600 mb-4">Kami menerapkan langkah-langkah keamanan standar industri:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                '🔐 Enkripsi HTTPS untuk semua komunikasi',
                '🗄️ Database dienkripsi at-rest',
                '🎟️ JWT token dengan expiry 30 hari',
                '🚦 Rate limiting untuk mencegah abuse',
                '📊 Security monitoring 24/7',
                '🔑 Autentikasi dua faktor via Telegram',
              ].map((item, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-lg p-3.5 text-slate-600">{item}</div>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">5. Penyimpanan & Retensi Data</h2>
            <p className="text-sm text-slate-600 mb-3">Data transaksi disimpan selama akun Anda aktif. Jika Anda menghapus akun, semua data terhapus permanen dalam 30 hari. Data log teknis dihapus otomatis setelah 90 hari.</p>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
              ⚠️ Data terikat pada ID Telegram Anda. Jika akun Telegram dihapus secara permanen, kami tidak dapat memulihkan koneksi ke data FinChat Anda.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">6. Hak-Hak Anda</h2>
            <div className="space-y-3 text-sm">
              {[
                { title: 'Hak Akses', desc: 'Anda dapat mengunduh seluruh data transaksi melalui fitur Export di dashboard.' },
                { title: 'Hak Koreksi', desc: 'Anda dapat mengedit atau menghapus transaksi kapan saja dari dashboard atau via bot.' },
                { title: 'Hak Hapus', desc: 'Hubungi support kami untuk menghapus akun dan semua data secara permanen.' },
                { title: 'Hak Portabilitas', desc: 'Data dapat diekspor ke format Excel untuk digunakan di platform lain.' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-800 mb-1">{item.title}</h3>
                  <p className="text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">7. Layanan Pihak Ketiga</h2>
            <p className="text-sm text-slate-600 mb-3">FinChat menggunakan beberapa layanan pihak ketiga yang memiliki kebijakan privasi masing-masing:</p>
            <div className="space-y-2 text-sm">
              {[
                { name: 'Telegram', purpose: 'Platform autentikasi dan pengiriman notifikasi', link: 'https://telegram.org/privacy' },
                { name: 'Anthropic (Claude AI)', purpose: 'Parsing natural language transaksi', link: 'https://www.anthropic.com/privacy' },
                { name: 'Midtrans', purpose: 'Pemrosesan pembayaran subscription', link: 'https://midtrans.com/privacypolicy' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3.5">
                  <div>
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    <span className="text-slate-500 ml-2">— {item.purpose}</span>
                  </div>
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700 text-xs font-medium shrink-0 ml-4">Baca Kebijakan ↗</a>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">8. Kontak & Pertanyaan</h2>
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
              <p className="mb-3">Jika Anda memiliki pertanyaan tentang kebijakan privasi ini atau ingin menggunakan hak-hak Anda, silakan hubungi kami:</p>
              <div className="space-y-2">
                <div>📧 Email: <a href="mailto:privacy@finchat.id" className="text-indigo-600 hover:underline">privacy@finchat.id</a></div>
                <div>💬 Telegram: <a href="https://t.me/finchat_support" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">@finchat_support</a></div>
              </div>
            </div>
          </section>
        </div>

        {/* Related links */}
        <div className="mt-16 pt-10 border-t border-slate-200 flex flex-col sm:flex-row gap-4">
          <Link href="/terms" className="flex-1 p-5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all text-sm">
            <span className="text-slate-400 text-xs uppercase tracking-wider">Bacaan Terkait</span>
            <p className="font-semibold text-slate-800 mt-1">Syarat & Ketentuan →</p>
          </Link>
          <Link href="/pricing" className="flex-1 p-5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all text-sm">
            <span className="text-slate-400 text-xs uppercase tracking-wider">Informasi Produk</span>
            <p className="font-semibold text-slate-800 mt-1">Lihat Pricing Plan →</p>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 mt-8">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-sm text-slate-400">
          <p>© {new Date().getFullYear()} FinChat</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-slate-700 transition-colors">Syarat</Link>
            <Link href="/" className="hover:text-slate-700 transition-colors">Beranda</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
