import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan — FinChat',
  description: 'Syarat dan ketentuan penggunaan layanan FinChat. Baca sebelum menggunakan platform pencatatan keuangan kami.',
};

export default function TermsPage() {
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
          <Link href="/" className="flex items-center">
            <Image src="/Logo2finchat.webp" alt="FinChat Logo" width={80} height={20} className="h-5 md:h-6 w-auto object-contain" />
          </Link>
        </div>
      </header>

      {/* CONTENT */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Legal</span>
          <h1 className="text-4xl font-bold text-slate-900 mt-4 mb-2">Syarat & Ketentuan</h1>
          <p className="text-slate-500 text-sm">Terakhir diperbarui: April 2026 · Versi 1.0</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-10 text-sm text-amber-800">
          <strong>Penting:</strong> Dengan menggunakan layanan FinChat, Anda dianggap telah membaca, memahami, dan menyetujui seluruh syarat dan ketentuan yang tercantum di halaman ini.
        </div>

        <div className="space-y-10 text-slate-600 text-sm leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. Definisi</h2>
            <div className="space-y-3">
              {[
                { term: '"FinChat"', def: 'Platform pencatatan keuangan pribadi yang terdiri dari Telegram Bot dan Web Dashboard, dioperasikan oleh Tim FinChat.' },
                { term: '"Pengguna"', def: 'Individu yang mendaftar dan menggunakan layanan FinChat melalui Telegram Bot atau Web Dashboard.' },
                { term: '"Layanan"', def: 'Seluruh fitur dan fungsi yang tersedia di platform FinChat, termasuk pencatatan transaksi, dashboard, dan laporan.' },
                { term: '"Konten Pengguna"', def: 'Semua data transaksi, kategori, dan informasi keuangan yang dimasukkan pengguna ke dalam sistem FinChat.' },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="font-mono font-bold text-indigo-600">{item.term}</span>
                  <span className="text-slate-500 mx-2">—</span>
                  <span className="text-slate-600">{item.def}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">2. Penerimaan Layanan</h2>
            <p className="mb-3">Untuk menggunakan FinChat, Anda harus:</p>
            <ul className="space-y-2">
              {[
                'Berusia minimal 17 tahun, atau mendapat persetujuan dari orang tua/wali',
                'Memiliki akun Telegram yang aktif dan valid',
                'Memberikan informasi yang akurat saat registrasi',
                'Tidak menggunakan layanan untuk keperluan ilegal atau merugikan pihak lain',
                'Mematuhi Syarat Layanan Telegram yang berlaku',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">3. Akun dan Keamanan</h2>
            <div className="space-y-4">
              <p>Akun FinChat Anda terikat langsung dengan ID Telegram Anda. Anda bertanggung jawab atas:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  'Keamanan akun Telegram Anda',
                  'Seluruh aktivitas yang terjadi di akun FinChat Anda',
                  'Melaporkan akses tidak sah sesegera mungkin',
                  'Tidak membagikan sesi login Anda kepada pihak lain',
                ].map((item, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-lg p-3.5 text-slate-600">
                    🔒 {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">4. Penggunaan yang Diizinkan</h2>
            <p className="mb-3">Layanan FinChat <strong className="text-slate-800">hanya boleh digunakan</strong> untuk:</p>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2 mb-4">
              {[
                '✅ Pencatatan keuangan pribadi',
                '✅ Pemantauan pengeluaran dan pemasukan',
                '✅ Manajemen budget rumah tangga',
                '✅ Pembuatan laporan keuangan pribadi',
              ].map((item, i) => <div key={i} className="text-emerald-700">{item}</div>)}
            </div>
            <p className="mb-3">Layanan <strong className="text-slate-800">tidak boleh digunakan</strong> untuk:</p>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
              {[
                '❌ Mencuci uang atau aktivitas keuangan ilegal',
                '❌ Menginput data milik orang lain tanpa izin',
                '❌ Melakukan scraping atau automated abuse terhadap sistem',
                '❌ Menjual kembali atau mendistribusikan layanan FinChat',
              ].map((item, i) => <div key={i} className="text-red-700">{item}</div>)}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">5. Subscription dan Pembayaran</h2>
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold text-slate-800 mb-2">5.1 Plan Berbayar</h3>
                <p>Plan Pro (Rp29.000/bln) dan Business (Rp79.000/bln) ditagihkan per bulan. Tidak ada kontrak jangka panjang. Pembayaran diproses melalui Midtrans.</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold text-slate-800 mb-2">5.2 Perpanjangan</h3>
                <p>Subscription <strong>tidak diperpanjang otomatis</strong>. Setelah masa aktif berakhir, akun kembali ke plan Free. Pengguna perlu melakukan pembayaran baru untuk memperpanjang.</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold text-slate-800 mb-2">5.3 Garansi & Refund</h3>
                <p>Kami memberikan <strong>garansi uang kembali 7 hari</strong> untuk pembelian pertama paket Pro dan Business. Refund dilakukan ke metode pembayaran asal dalam 3–5 hari kerja. Hubungi support untuk mengajukan refund.</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold text-slate-800 mb-2">5.4 Perubahan Harga</h3>
                <p>Kami berhak mengubah harga dengan pemberitahuan minimal 30 hari sebelumnya melalui email atau notifikasi Telegram. Subscription yang sedang aktif tidak terpengaruh hingga masa berlakunya berakhir.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">6. Batasan Layanan</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <p className="mb-3">FinChat disediakan "sebagaimana adanya" (<em>as-is</em>). Kami berkomitmen untuk menjaga ketersediaan layanan namun tidak dapat menjamin:</p>
              <ul className="space-y-2">
                {[
                  'Layanan tersedia 100% tanpa gangguan (target uptime 99.5%)',
                  'Hasil analisis keuangan bebas dari error (gunakan sebagai referensi, bukan satu-satunya dasar keputusan)',
                  'Akurasi parsing AI mencapai 100% untuk semua jenis pesan',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-600">
                    <span className="text-slate-400 mt-1">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">7. Kekayaan Intelektual</h2>
            <p>Seluruh elemen platform FinChat — termasuk nama, logo, kode, desain, dan konten — adalah milik Tim FinChat dan dilindungi oleh hukum kekayaan intelektual yang berlaku di Indonesia. Anda tidak diperkenankan menyalin, mendistribusikan, atau memodifikasi elemen tersebut tanpa izin tertulis.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">8. Penghentian Layanan</h2>
            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p><strong className="text-slate-800">Oleh Pengguna:</strong> Anda dapat menghentikan penggunaan layanan kapan saja dengan menghapus akun melalui permintaan ke support kami.</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p><strong className="text-slate-800">Oleh FinChat:</strong> Kami berhak menangguhkan atau menghapus akun yang melanggar syarat ini, dengan atau tanpa pemberitahuan sebelumnya tergantung tingkat pelanggaran.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">9. Hukum yang Berlaku</h2>
            <p>Syarat dan Ketentuan ini tunduk pada hukum yang berlaku di Republik Indonesia. Segala sengketa yang timbul akan diselesaikan secara musyawarah, atau jika tidak tercapai kesepakatan, melalui pengadilan yang berwenang di Indonesia.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">10. Hubungi Kami</h2>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="mb-3">Pertanyaan seputar Syarat & Ketentuan ini dapat disampaikan ke:</p>
              <div className="space-y-2 text-sm">
                <div>📧 Email: <a href="mailto:legal@finchat.id" className="text-indigo-600 hover:underline">legal@finchat.id</a></div>
                <div>💬 Telegram: <a href="https://t.me/finchat_support" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">@finchat_support</a></div>
              </div>
            </div>
          </section>
        </div>

        {/* Related links */}
        <div className="mt-16 pt-10 border-t border-slate-200 flex flex-col sm:flex-row gap-4">
          <Link href="/privacy" className="flex-1 p-5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all text-sm">
            <span className="text-slate-400 text-xs uppercase tracking-wider">Bacaan Terkait</span>
            <p className="font-semibold text-slate-800 mt-1">Kebijakan Privasi →</p>
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
            <Link href="/privacy" className="hover:text-slate-700 transition-colors">Privasi</Link>
            <Link href="/" className="hover:text-slate-700 transition-colors">Beranda</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
