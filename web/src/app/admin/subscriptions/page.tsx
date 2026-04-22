'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '@/context/AdminContext';
import {
  ChevronLeft, ChevronRight, Pencil, X, Check,
  Filter, Crown
} from 'lucide-react';

interface SubRow {
  id: string; user_id: string; plan: string; status: string; billing_period: string;
  started_at: string; expires_at: string | null; created_at: string;
  user_name: string; user_username: string; telegram_id: string;
}
interface Pagination { page: number; limit: number; total: number; totalPages: number; }

function formatDateTime(s: string | null): string {
  if (!s) return '-';
  return new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatDate(s: string | null): string {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
function statusBadge(status: string) {
  const s: Record<string, string> = { active: 'bg-[#a2c828]/20 text-[#7d9c1f]', expired: 'bg-slate-100 text-slate-600', cancelled: 'bg-red-100 text-red-700' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${s[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
}
function planBadge(plan: string) {
  const s: Record<string, string> = { free: 'bg-slate-100 text-slate-600', pro: 'bg-[#a2c828]/20 text-[#7d9c1f]', business: 'bg-[#7d9c1f]/20 text-[#5a7117]' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${s[plan] || s.free}`}>{plan}</span>;
}

export default function AdminSubscriptionsPage() {
  const { adminFetch } = useAdmin();
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [editSub, setEditSub] = useState<SubRow | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const loadSubs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await adminFetch<{ subscriptions: SubRow[]; pagination: Pagination }>(`/api/admin/subscriptions?${params}`);
      setSubs(res.subscriptions);
      setPagination(res.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [adminFetch, statusFilter]);

  useEffect(() => { loadSubs(1); }, [loadSubs]);

  const handleEdit = (sub: SubRow) => {
    setEditSub(sub);
    setEditStatus(sub.status);
    setEditExpiry(sub.expires_at ? new Date(sub.expires_at).toISOString().slice(0, 16) : '');
  };

  const saveSub = async () => {
    if (!editSub) return;
    setEditSaving(true);
    try {
      const body: any = {};
      if (editStatus !== editSub.status) body.status = editStatus;
      if (editExpiry) body.expires_at = new Date(editExpiry).toISOString();
      
      await adminFetch(`/api/admin/subscriptions/${editSub.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      showToast(`Subscription berhasil diupdate`);
      setEditSub(null);
      loadSubs(pagination.page);
    } catch (err: any) { showToast(err.message || 'Gagal update', 'error'); }
    finally { setEditSaving(false); }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
        <p className="text-sm text-slate-500 mt-0.5">{pagination.total} total subscription records</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a2c828] appearance-none cursor-pointer">
            <option value="">Semua Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
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
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Periode</th>
                  <th className="px-4 py-3 font-medium">Mulai</th>
                  <th className="px-4 py-3 font-medium">Berakhir</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-slate-800 text-sm font-medium">{sub.user_name}</div>
                      {sub.user_username && <div className="text-slate-400 text-xs">@{sub.user_username}</div>}
                    </td>
                    <td className="px-4 py-3">{planBadge(sub.plan)}</td>
                    <td className="px-4 py-3">{statusBadge(sub.status)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs capitalize">{sub.billing_period || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(sub.started_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${isExpired(sub.expires_at) && sub.status === 'active' ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                        {formatDate(sub.expires_at)}
                        {isExpired(sub.expires_at) && sub.status === 'active' && ' ⚠️'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEdit(sub)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#a2c828] hover:bg-[#a2c828]/10 transition-colors" title="Edit">
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {subs.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                    <Crown size={32} className="mx-auto mb-2 opacity-40" />Tidak ada subscription
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Hal {pagination.page}/{pagination.totalPages} · {pagination.total} subscriptions</p>
            <div className="flex gap-1">
              <button onClick={() => loadSubs(pagination.page - 1)} disabled={pagination.page <= 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button onClick={() => loadSubs(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editSub && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Edit Subscription</h2>
              <button onClick={() => setEditSub(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">User:</span> <span className="text-slate-700">{editSub.user_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Plan:</span> <span className="capitalize text-slate-700">{editSub.plan}</span></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a2c828] appearance-none">
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Berakhir</label>
              <input type="datetime-local" value={editExpiry} onChange={(e) => setEditExpiry(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a2c828]" />
            </div>
            {editStatus !== editSub.status && (editStatus === 'expired' || editStatus === 'cancelled') && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                ⚠️ Menonaktifkan subscription akan men-downgrade user ke plan yang tersisa (atau free).
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditSub(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
              <button onClick={saveSub} disabled={editSaving}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{background: 'linear-gradient(135deg, #a2c828, #7d9c1f)'}}>
                {editSaving ? 'Menyimpan...' : 'Simpan'}
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
