


PRODUCT REQUIREMENTS DOCUMENT
FinChat
Personal Finance Tracker via Telegram + Web Dashboard

Versi 1.0
April 2026


Atribut	Detail
Nama Produk	FinChat
Tipe Produk	Chatbot Telegram + Web Dashboard
Target Pengguna	Individu / Karyawan / Freelancer / Mahasiswa
Platform	Telegram Bot + Progressive Web App (PWA)
Bahasa	Indonesia
Status Dokumen	Draft - v1.0
Dibuat oleh	Product Team
Tanggal	April 2026

 
1. Overview & Latar Belakang
1.1 Latar Belakang
Banyak orang Indonesia kesulitan mencatat keuangan pribadi secara konsisten. Aplikasi keuangan yang ada sering kali terlalu kompleks, membutuhkan banyak langkah, dan tidak terintegrasi dengan platform chat yang sudah mereka gunakan sehari-hari seperti Telegram.

FinChat hadir sebagai solusi yang memungkinkan pengguna mencatat pengeluaran dan pemasukan hanya dengan mengirim pesan chat biasa di Telegram, tanpa perlu membuka aplikasi terpisah atau mengisi form yang panjang.

1.2 Masalah yang Diselesaikan
•	Pencatatan keuangan manual (Excel/buku) tidak praktis dan sering terlupakan
•	Aplikasi keuangan yang ada terlalu rumit untuk penggunaan sehari-hari
•	Tidak ada cara cepat untuk mencatat transaksi saat sedang di luar rumah
•	Sulit melihat pola pengeluaran tanpa visualisasi yang jelas
•	Tidak ada pengingat otomatis untuk budget yang hampir habis

1.3 Solusi
Chatbot Telegram yang memproses pesan natural language untuk mencatat transaksi keuangan secara real-time, dikombinasikan dengan web dashboard yang menampilkan visualisasi dan laporan keuangan secara komprehensif.

 
2. Goals & Objectives
2.1 Business Goals
1.	Mencapai 1.000 pengguna aktif dalam 6 bulan pertama setelah launch
2.	Mencapai konversi 15% dari Free ke Plan Berbayar dalam 12 bulan
3.	Membangun produk yang sustainable dengan recurring revenue dari subscription
4.	Menjadi aplikasi pencatatan keuangan #1 berbasis Telegram di Indonesia

2.2 User Goals
5.	Mencatat pengeluaran/pemasukan dalam waktu kurang dari 10 detik
6.	Melihat ringkasan keuangan bulanan tanpa harus menghitung manual
7.	Mendapatkan insight tentang kebiasaan belanja
8.	Mengelola budget per kategori dengan mudah

2.3 Non-Goals (Out of Scope v1.0)
•	Integrasi langsung dengan rekening bank / e-wallet
•	Fitur multi-user / shared expenses
•	Investasi dan portofolio tracking
•	Scan struk belanja (OCR)
•	Bot di platform lain (WhatsApp, LINE) - hanya Telegram untuk v1.0

 
3. Target Pengguna
3.1 Persona Utama

Persona 1: Budi - Karyawan Kantoran
Atribut	Detail
Usia	25-35 tahun
Pekerjaan	Karyawan swasta / startup
Pain Point	Gaji habis sebelum akhir bulan tapi tidak tahu kemana perginya
Behavior	Aktif di Telegram, nyaman dengan chat, tidak suka install banyak app
Goal	Bisa nabung minimal 20% dari gaji setiap bulan

Persona 2: Rina - Freelancer
Atribut	Detail
Usia	22-30 tahun
Pekerjaan	Freelancer / content creator / desainer
Pain Point	Pendapatan tidak tetap, susah track pemasukan dari berbagai klien
Behavior	Mobile-first, multitasking, sering di luar rumah
Goal	Tahu total pemasukan per bulan dan bisa pisahkan untuk pajak

Persona 3: Dian - Mahasiswa
Atribut	Detail
Usia	18-24 tahun
Pekerjaan	Mahasiswa / part-time
Pain Point	Uang bulanan dari orang tua selalu habis di pertengahan bulan
Behavior	Power user Telegram, tech-savvy, suka hal yang simpel
Goal	Bisa atur keuangan agar uang cukup sampai akhir bulan

 
4. Fitur & Requirement
4.1 Telegram Bot
FR-001: Pencatatan Transaksi Natural Language
Field	Detail
Prioritas	P0 - Must Have
Deskripsi	Pengguna dapat mencatat transaksi dengan mengetik pesan bebas dalam Bahasa Indonesia
Input Contoh	"Beli kopi 25rb", "Makan siang 45000", "Terima gaji 5jt"
Output	Bot membalas konfirmasi dengan detail: kategori, nominal, tanggal
Flow	User kirim pesan > Bot parsing > Bot konfirmasi > User approve > Disimpan ke DB
Edge Case	Jika nominal tidak jelas, bot tanya ulang. Jika kategori ambigu, bot tawarkan pilihan.

FR-002: Kategorisasi Otomatis
Field	Detail
Prioritas	P0 - Must Have
Deskripsi	Bot otomatis mendeteksi kategori berdasarkan kata kunci dalam pesan
Kategori Default	Makanan & Minuman, Transportasi, Belanja, Hiburan, Kesehatan, Tagihan, Gaji, Investasi, Lainnya
Accuracy Target	Minimal 85% akurasi untuk kata kunci umum
Fallback	Jika tidak terdeteksi, default ke kategori "Lainnya" dan tanya pengguna

FR-003: Command Shortcut
Selain natural language, bot juga mendukung command standar:
Command	Fungsi
/start	Onboarding & registrasi akun baru
/ringkasan	Tampilkan ringkasan pengeluaran hari ini
/bulanini	Laporan singkat bulan berjalan di chat
/budget	Lihat sisa budget per kategori
/hapus	Hapus transaksi terakhir
/dashboard	Kirim link menuju web dashboard
/bantuan	Daftar semua command yang tersedia

FR-004: Konfirmasi & Edit Transaksi
Field	Detail
Prioritas	P0 - Must Have
Flow	Setiap transaksi ditampilkan dulu untuk dikonfirmasi sebelum disimpan
Aksi tersedia	Simpan / Edit Nominal / Edit Kategori / Batalkan
UI	Inline keyboard button di Telegram untuk aksi cepat

FR-005: Notifikasi & Reminder
Field	Detail
Prioritas	P1 - Should Have
Reminder Harian	Opsional, kirim pesan "Jangan lupa catat pengeluaran hari ini!" jam 21.00
Alert Budget	Notif otomatis saat pengeluaran kategori mencapai 80% dan 100% budget
Ringkasan Mingguan	Setiap Senin pagi, kirim ringkasan pengeluaran minggu lalu
Laporan Bulanan	Tanggal 1 setiap bulan, kirim ringkasan bulan sebelumnya

4.2 Web Dashboard
FR-006: Halaman Ringkasan (Home)
Field	Detail
Prioritas	P0 - Must Have
Konten	Total pemasukan bulan ini, Total pengeluaran bulan ini, Saldo bersih, Pengeluaran vs bulan lalu (%)
Visual	Card summary di bagian atas, grafik bar pemasukan vs pengeluaran 6 bulan terakhir
Update	Real-time / auto-refresh setiap 30 detik

FR-007: Grafik & Analisis
Field	Detail
Prioritas	P0 - Must Have
Grafik Kategori	Donut chart breakdown pengeluaran per kategori bulan ini
Grafik Trend	Line chart pengeluaran harian selama 30 hari terakhir
Grafik Bulanan	Bar chart pemasukan vs pengeluaran 12 bulan terakhir
Filter	Filter by bulan, tahun, dan kategori

FR-008: Riwayat Transaksi
Field	Detail
Prioritas	P0 - Must Have
Tampilan	Tabel dengan kolom: Tanggal, Deskripsi, Kategori, Tipe, Nominal
Fitur	Search, filter kategori, filter tipe (pemasukan/pengeluaran), filter tanggal
Aksi	Edit dan hapus transaksi langsung dari tabel
Pagination	20 transaksi per halaman

FR-009: Manajemen Budget
Field	Detail
Prioritas	P1 - Should Have
Fungsi	Set budget bulanan per kategori
Visual	Progress bar per kategori: sudah terpakai / total budget
Status	Hijau (<70%), Kuning (70-90%), Merah (>90%)
Edit	Bisa ubah budget kapan saja

FR-010: Export Laporan
Field	Detail
Prioritas	P1 - Should Have
Format	PDF dan Excel (.xlsx)
Konten	Riwayat transaksi + ringkasan + grafik (PDF)
Filter Export	Pilih rentang tanggal dan kategori sebelum export
Akses	Fitur Pro Plan

FR-011: Autentikasi & Keamanan
Field	Detail
Prioritas	P0 - Must Have
Login Method	Login via Telegram (Telegram Login Widget) - tidak perlu password terpisah
Session	JWT token, auto-expire setelah 30 hari
Keamanan Data	Enkripsi data sensitif di database, HTTPS only
2FA	Sudah tercover oleh keamanan akun Telegram pengguna

 
5. User Flow
5.1 Flow Onboarding
9.	User temukan bot FinChat di Telegram
10.	User klik /start
11.	Bot menyapa dan meminta konfirmasi nama pengguna (ambil dari Telegram)
12.	Bot tanya preferensi: mata uang (default IDR), zona waktu (default WIB)
13.	Bot tanya apakah ingin set budget awal (bisa skip)
14.	Bot kirim link web dashboard dan cara penggunaannya
15.	Onboarding selesai, user langsung bisa mulai catat transaksi

5.2 Flow Pencatatan Transaksi
16.	User kirim pesan: "Beli makan siang 35rb di warteg"
17.	Bot parsing: Pengeluaran - Makanan & Minuman - Rp35.000 - hari ini
18.	Bot kirim konfirmasi: "Saya akan catat: Makan Siang Rp35.000 (Makanan & Minuman). Benar?" + tombol [Simpan] [Edit] [Batal]
19.	User klik [Simpan]
20.	Bot balas: "Tersimpan! Pengeluaran hari ini: Rp87.000"
21.	Data otomatis muncul di web dashboard

5.3 Flow Melihat Laporan di Dashboard
22.	User buka link dashboard (dari /dashboard atau bookmark)
23.	Login otomatis via Telegram Widget
24.	Halaman home menampilkan ringkasan bulan ini
25.	User klik menu Analisis untuk melihat grafik
26.	User filter berdasarkan bulan atau kategori tertentu
27.	User klik Export untuk download laporan PDF

 
6. Arsitektur & Tech Stack
6.1 Komponen Sistem
Komponen	Teknologi	Keterangan
Telegram Bot	Node.js + Grammy.js	Framework bot Telegram yang ringan dan modern
AI / NLP Parser	Claude API (Anthropic)	Parsing natural language transaksi keuangan
Backend API	Node.js + Express / Fastify	REST API untuk komunikasi bot & dashboard
Database	PostgreSQL	Penyimpanan utama data transaksi & user
Cache	Redis	Session management & rate limiting
Web Dashboard	Next.js + React	Progressive Web App yang mobile-friendly
Grafik	Recharts / Chart.js	Library visualisasi data di frontend
Auth	Telegram Login Widget + JWT	Autentikasi tanpa password
Hosting Bot+API	Railway / Render	Cloud hosting affordable untuk startup
Hosting Frontend	Vercel	CDN global, gratis untuk proyek awal
Database Host	Supabase / Neon.tech	PostgreSQL managed, free tier tersedia

6.2 Arsitektur Data Flow
1. User kirim pesan ke Telegram Bot
2. Bot terima pesan via Webhook (Telegram -> Server)
3. Server kirim teks ke Claude API untuk parsing
4. Claude API return data terstruktur (nominal, kategori, tipe, tanggal)
5. Data disimpan ke PostgreSQL
6. Bot kirim konfirmasi ke user
7. Web Dashboard fetch data via REST API dan tampilkan real-time

6.3 Database Schema (Ringkasan)
Tabel	Kolom Utama	Keterangan
users	id, telegram_id, name, timezone, created_at	Data pengguna
transactions	id, user_id, amount, type, category, description, date, created_at	Semua transaksi
categories	id, name, icon, color	Master kategori
budgets	id, user_id, category_id, amount, month, year	Budget per kategori per bulan
subscriptions	id, user_id, plan, status, expires_at	Data langganan berbayar

 
7. Model Bisnis & Monetisasi
7.1 Pricing Plan
Fitur	Free	Pro (Rp29rb/bln)	Premium (Rp59rb/bln)
Pencatatan transaksi	Max 50/bulan	Unlimited	Unlimited
Kategori custom	Tidak	Ya (max 10)	Ya (unlimited)
Web dashboard	Basic	Lengkap	Lengkap
Grafik & analisis	Terbatas	Semua grafik	Semua grafik
Budget management	Tidak	Ya	Ya
Export PDF/Excel	Tidak	Ya	Ya
Notifikasi & reminder	Basic	Semua	Semua
Riwayat data	3 bulan	12 bulan	Unlimited
Prioritas support	Tidak	Tidak	Ya

7.2 Proyeksi Pendapatan (12 Bulan)
Bulan	Total User	Free	Pro	Premium	Estimasi MRR
Bulan 1-2	200	180	18	2	Rp634.000
Bulan 3-4	500	425	60	15	Rp2.625.000
Bulan 6	1.000	820	140	40	Rp6.460.000
Bulan 12	5.000	3.900	850	250	Rp39.250.000

 
8. Roadmap & Milestones
Phase 1: MVP (Bulan 1-2)
•	Setup Telegram Bot dengan Grammy.js
•	Integrasi Claude API untuk NLP parsing transaksi
•	Database PostgreSQL dengan schema dasar
•	Web dashboard basic: halaman ringkasan + riwayat transaksi
•	Login via Telegram Widget
•	Deployment ke Railway + Vercel
•	Beta testing dengan 20-50 pengguna

Phase 2: Growth Features (Bulan 3-4)
•	Grafik dan visualisasi lengkap di dashboard
•	Fitur budget management
•	Notifikasi dan reminder otomatis
•	Implementasi subscription (Free vs Pro)
•	Export laporan PDF dan Excel
•	Perbaikan UX berdasarkan feedback beta

Phase 3: Scale (Bulan 5-6)
•	Optimasi performa dan skalabilitas
•	Fitur kategori custom
•	Analisis insight otomatis ("Pengeluaran kopi kamu naik 30% bulan ini")
•	Program referral
•	Landing page dan marketing campaign
•	Target: 1.000 pengguna aktif

Phase 4: Expansion (Bulan 7-12)
•	Scan struk / foto (OCR)
•	Integrasi e-wallet (GoPay, OVO) via open API
•	Fitur goals / tabungan target
•	Multiple bahasa (English)
•	Mobile app (React Native)

 
9. Success Metrics & KPI
Kategori	Metrik	Target (Bulan 6)
Akuisisi	Total pengguna terdaftar	1.000 user
Engagement	DAU (Daily Active Users)	200 user/hari
Retention	Day-30 Retention Rate	Minimal 40%
Core Feature	Transaksi dicatat per user/bulan	Minimal 20 transaksi
Konversi	Free to Paid conversion rate	Minimal 15%
Revenue	Monthly Recurring Revenue (MRR)	Rp5.000.000
Kualitas	NPS Score	Minimal 50
Bot Performance	Response time bot	< 2 detik
Bot Performance	Akurasi parsing transaksi	> 90%

 
10. Risiko & Mitigasi
Risiko	Probabilitas	Dampak	Mitigasi
Biaya Claude API terlalu tinggi seiring pertumbuhan user	Tinggi	Tinggi	Implementasi caching hasil parsing, batasi panjang pesan, pertimbangkan fine-tuned model kecil untuk v2
Telegram membatasi bot / perubahan kebijakan	Rendah	Tinggi	Siapkan adapter untuk WhatsApp Business API sebagai backup
Akurasi NLP parsing rendah untuk slang/bahasa gaul	Sedang	Sedang	Fine-tuning prompt dengan dataset transaksi Indonesia, tambahkan mekanisme koreksi mudah
Kesulitan mendapat user karena pasar sudah ramai	Sedang	Tinggi	Fokus pada differensiasi UX (paling simpel), komunitas Telegram, konten edukasi keuangan
Keamanan data keuangan user bocor	Rendah	Sangat Tinggi	Enkripsi end-to-end, security audit, tidak simpan data sensitif rekening bank

 
11. Appendix
11.1 Contoh Percakapan Bot
User	Bot
Beli kopi di Starbucks 65rb	Siap! Saya catat: ☕ Kopi - Makanan & Minuman Rp65.000 | Hari ini  [Simpan] [Edit] [Batal]
Simpan	Tersimpan! Total pengeluaran hari ini: Rp127.000 Sisa budget Makanan & Minuman: Rp373.000
Gaji masuk 8jt	Siap! Saya catat: 💰 Gaji - Pemasukan Rp8.000.000 | Hari ini  [Simpan] [Edit] [Batal]
Berapa pengeluaran minggu ini?	Pengeluaran minggu ini (1-7 April): Total: Rp387.000  🍜 Makanan: Rp180.000 (46%) 🚌 Transport: Rp95.000 (25%) 🎮 Hiburan: Rp112.000 (29%)  Lihat detail: [Buka Dashboard]

11.2 Referensi & Inspirasi
•	Toshl Finance - UX pencatatan yang simpel
•	Money Manager - kategorisasi transaksi
•	Splitwise - pengalaman pengguna yang frictionless
•	Cleo (UK) - AI financial assistant via chat

