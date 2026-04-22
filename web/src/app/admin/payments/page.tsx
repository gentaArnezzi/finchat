'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '@/context/AdminContext';
import {
  ChevronLeft, ChevronRight, Pencil, X, Check,
  Filter, CreditCard
} from 'lucide-react';

interface PaymentRow {
  id: string; user_id: string; order_id: string; plan: string; amount: number;
  payment_method: string; status: string; billing_period: string;
  paid_at: string | null; created_at: string; user_name: string; user_username: string; telegram_id: string;
}
interface Pagination { page: number; limit: number; total: number; totalPages: number; }

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}
function formatDateTime(s: string | null): string {
  if (!s) return '-';
  return new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function statusBadge(status: string) {
  const s: Record<string, string> = { paid: 'bg-[#a2c828]/20 text-[#7d9c1f]', pending: 'bg-amber-100 text-amber-700', failed: 'bg-red-100 text-red-700', refunded: 'bg-slate-100 text-slate-600' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${s[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
}
function planBadge(plan: string) {
  const s: Record<string, string> = { free: 'bg-slate-100 text-slate-600', pro: 'bg-[#a2c828]/20 text-[#7d9c1f]', business: 'bg-[#7d9c1f]/20 text-[#5a7117]' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${s[plan] || s.free}`}>{plan}</span>;
}

export default function AdminPaymentsPage() {
  const { adminFetch } = useAdmin();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [editPayment, setEditPayment] = useState<PaymentRow | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const loadPayments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await adminFetch<{ payments: PaymentRow[]; pagination: Pagination }>(`/api/admin/payments?${params}`);
      setPayments(res.payments);
      setPagination(res.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [adminFetch, statusFilter]);

  useEffect(() => { loadPayments(1); }, [loadPayments]);

  const handleEditStatus = (payment: PaymentRow) => {
    setEditPayment(payment);
    setEditStatus(payment.status);
  };

  const saveStatus = async () => {
    if (!editPayment) return;
    setEditSaving(true);
    try {
      await adminFetch(`/api/admin/payments/${editPayment.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: editStatus }),
      });
      showToast(`Payment ${editPayment.order_id} diupdate ke ${editStatus}`);
      setEditPayment(null);
      loadPayments(pagination.page);
    } catch (err: any) { showToast(err.message || 'Gagal update', 'error'); }
    finally { setEditSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-sm text-slate-500 mt-0.5">{pagination.total} total payment records</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a2c828] appearance-none cursor-pointer">
            <option value="">Semua Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
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
                  <th className="px-4 py-3 font-medium">Order ID</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Periode</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 max-w-[160px] truncate">{p.order_id}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800 text-xs font-medium">{p.user_name}</div>
                      {p.user_username && <div className="text-slate-400 text-xs">@{p.user_username}</div>}
                    </td>
                    <td className="px-4 py-3">{planBadge(p.plan)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{formatRupiah(parseFloat(String(p.amount)))}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs capitalize">{p.payment_method || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs capitalize">{p.billing_period || '-'}</td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(p.paid_at || p.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEditStatus(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#a2c828] hover:bg-[#a2c828]/10 transition-colors" title="Edit Status">
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-16 text-center text-slate-400">
                    <CreditCard size={32} className="mx-auto mb-2 opacity-40" />Belum ada payment
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Hal {pagination.page}/{pagination.totalPages} · {pagination.total} payments</p>
            <div className="flex gap-1">
              <button onClick={() => loadPayments(pagination.page - 1)} disabled={pagination.page <= 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button onClick={() => loadPayments(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Status Modal */}
      {editPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Update Payment Status</h2>
              <button onClick={() => setEditPayment(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Order:</span> <span className="font-mono text-slate-700">{editPayment.order_id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">User:</span> <span className="text-slate-700">{editPayment.user_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Amount:</span> <span className="font-medium text-slate-700">{formatRupiah(parseFloat(String(editPayment.amount)))}</span></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a2c828] appearance-none">
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            {editStatus === 'paid' && editPayment.status !== 'paid' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-700">
                ✅ Menandai sebagai &quot;paid&quot; akan otomatis mengaktifkan subscription user.
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditPayment(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
              <button onClick={saveStatus} disabled={editSaving || editStatus === editPayment.status}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{background: 'linear-gradient(135deg, #a2c828, #7d9c1f)'}}>
                {editSaving ? 'Menyimpan...' : 'Update Status'}
              </button>
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
