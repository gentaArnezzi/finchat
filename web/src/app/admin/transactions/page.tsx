'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '@/context/AdminContext';
import {
  Search, ChevronLeft, ChevronRight, Trash2, X, Check,
  AlertTriangle, Filter, ReceiptText, TrendingUp, TrendingDown
} from 'lucide-react';

interface TxRow {
  id: string; user_id: string; amount: number; type: string; description: string;
  date: string; created_at: string; user_name: string; user_username: string; category_name: string;
}
interface Pagination { page: number; limit: number; total: number; totalPages: number; }

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}
function formatDate(s: string | null): string {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminTransactionsPage() {
  const { adminFetch } = useAdmin();
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteTx, setDeleteTx] = useState<TxRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const loadTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      const res = await adminFetch<{ transactions: TxRow[]; pagination: Pagination }>(`/api/admin/transactions?${params}`);
      setTransactions(res.transactions);
      setPagination(res.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [adminFetch, search, typeFilter]);

  useEffect(() => { loadTransactions(1); }, [loadTransactions]);

  const handleDelete = async () => {
    if (!deleteTx) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/transactions/${deleteTx.id}`, { method: 'DELETE' });
      showToast('Transaksi berhasil dihapus');
      setDeleteTx(null);
      loadTransactions(pagination.page);
    } catch (err: any) { showToast(err.message || 'Gagal hapus', 'error'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Transaksi</h1>
        <p className="text-sm text-slate-500 mt-0.5">{pagination.total} total transaksi dari semua user</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Cari deskripsi atau nama user..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a2c828]" />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a2c828] appearance-none cursor-pointer">
            <option value="">Semua Tipe</option>
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-[#a2c828] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="px-4 py-3 font-medium">Deskripsi</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Tipe</th>
                  <th className="px-4 py-3 font-medium text-right">Jumlah</th>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 max-w-[200px] truncate">{tx.description || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-600 text-xs">{tx.user_name}</div>
                      {tx.user_username && <div className="text-slate-400 text-xs">@{tx.user_username}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{tx.category_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {tx.type === 'income' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {tx.type === 'income' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{formatRupiah(parseFloat(String(tx.amount)))}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDeleteTx(tx)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Hapus">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                    <ReceiptText size={32} className="mx-auto mb-2 opacity-40" />Tidak ada transaksi ditemukan
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Hal {pagination.page}/{pagination.totalPages} · {pagination.total} transaksi</p>
            <div className="flex gap-1">
              <button onClick={() => loadTransactions(pagination.page - 1)} disabled={pagination.page <= 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button onClick={() => loadTransactions(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600"><AlertTriangle size={24} /><h2 className="text-lg font-bold">Hapus Transaksi</h2></div>
            <p className="text-sm text-slate-600">Hapus transaksi <strong>{deleteTx.description || 'ini'}</strong> ({formatRupiah(parseFloat(String(deleteTx.amount)))}) milik <strong>{deleteTx.user_name}</strong>?</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteTx(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">{deleting ? 'Menghapus...' : 'Hapus'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2 animate-slide-up-fade ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}{toast.message}
        </div>
      )}
    </div>
  );
}
