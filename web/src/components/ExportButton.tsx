'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface ExportButtonProps {
  apiUrl: string;
  token: string | null;
}

export default function ExportButton({ apiUrl, token }: ExportButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await api.checkFeature('export');
        setHasAccess(res.hasAccess);
      } catch {
        setHasAccess(false);
      }
    };
    if (token) checkAccess();
  }, [token]);

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!token) {
      alert('Silakan login terlebih dahulu');
      return;
    }
    
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(
        `${apiUrl}/api/export/${format}?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 403) {
        alert('Fitur Export hanya tersedia untuk plan Pro dan Business. Upgrade sekarang!');
        setShowModal(false);
        return;
      }

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finchat-laporan.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowModal(false);
    } catch (error) {
      alert('Gagal export laporan. Coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  // If no access, show locked/upgrade button
  if (hasAccess === false) {
    return (
      <Link
        href="/dashboard/upgrade"
        className="px-4 py-2 bg-slate-200 text-slate-500 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-slate-300 transition-colors"
      >
        🔒 Export <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">PRO</span>
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm font-medium transition-colors"
      >
        📥 Export
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📥 Export Laporan</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dari Tanggal (opsional)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sampai Tanggal (opsional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleExport('pdf')}
                disabled={exporting}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 font-medium text-sm transition-colors"
              >
                {exporting ? '⏳ ...' : '📄 PDF'}
              </button>
              <button
                onClick={() => handleExport('excel')}
                disabled={exporting}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm transition-colors"
              >
                {exporting ? '⏳ ...' : '📊 Excel'}
              </button>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-3 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </>
  );
}
