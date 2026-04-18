import type { Metadata, Viewport } from 'next';
import ServiceWorkerRegister from '@/components/ServiceWorker';
import './globals.css';

export const metadata: Metadata = {
  title: 'FinChat - Chatbot Pencatat Keuangan Pribadi via Telegram',
  description: 'Catat pengeluaran dan pemasukan dengan mudah via Telegram. Chatbot AI pintar yang membantu mengelola budget, analisa laporan, dan melacak keuangan secara otomatis.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'FinChat - Kendalikan Keuangan Lewat Chat Telegram',
    description: 'Catat pengeluaran dan pemasukan dengan mudah via Telegram. Cepat, aman, dan tanpa aplikasi ribet.',
    url: 'https://finchat.app', // update domain when available
    siteName: 'FinChat',
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinChat - Personal Finance Tracker',
    description: 'Catat pengeluaran dan pemasukan dengan mudah via Telegram.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  keywords: ['finance', 'personal finance', 'telegram', 'budget', 'expense tracker', 'indonesia', 'pencatat keuangan', 'chatbot keuangan'],
  authors: [{ name: 'FinChat Team' }],
};

export const viewport: Viewport = {
  themeColor: '#10B981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
             __html: JSON.stringify({
               "@context": "https://schema.org",
               "@type": "SoftwareApplication",
               "name": "FinChat",
               "operatingSystem": "Web, Telegram",
               "applicationCategory": "FinanceApplication",
               "offers": {
                 "@type": "Offer",
                 "price": "0",
                 "priceCurrency": "IDR"
               },
               "description": "Catat pengeluaran dan pemasukan dengan mudah via Telegram. Cepat, aman, dan tanpa aplikasi ribet."
             })
          }}
        />
      </head>
      <body className="antialiased bg-gray-50 min-h-screen font-sans">
        {children}
        {process.env.NODE_ENV === 'production' && <ServiceWorkerRegister />}
      </body>
    </html>
  );
}