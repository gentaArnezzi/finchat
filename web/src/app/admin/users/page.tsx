'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '@/context/AdminContext';
import {
  Search, ChevronLeft, ChevronRight, Pencil, Trash2, X, Check,
  AlertTriangle, Filter, Users as UsersIcon
} from 'lucide-react';

interface UserRow {
  id: string; telegram_id: string; name: string; username: string; plan: string;
  timezone: string; created_at: string; transaction_count: number; last_transaction_at: string | null;
}
interface Pagination { page: number; limit: number; total: number; totalPages: number; }

function formatDate(s: string | null): string {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function planBadge(plan: string) {
  const s: Record<string, string> = { free: 'bg-slate-100 text-slate-600', pro: 'bg-amber-100 text-amber-700', business: 'bg-purple-100 text-purple-700' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${s[plan] || s.free}`}>{plan || 'free'}</span>;
}

export default function AdminUsersPage() {
  const { adminFetch } = useAdmin();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editName, setEditName] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.set('search', search);
      if (planFilter) params.set('plan', planFilter);
      const res = await adminFetch<{ users: UserRow[]; pagination: Pagination }>(`/api/admin/users?${params}`);
      setUsers(res.users);
      setPagination(res.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [adminFetch, search, planFilter]);

  useEffect(() => { loadUsers(1); }, [loadUsers]);

  const handleEdit = (user: UserRow) => {
    setEditUser(user);
    setEditPlan(user.plan || 'free');
    setEditName(user.name);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setEditSaving(true);
    try {
      await adminFetch(`/api/admin/users/${editUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ plan: editPlan, name: editName }),
      });
      showToast(`User ${editName} berhasil diupdate`);
      setEditUser(null);
      loadUsers(pagination.page);
    } catch (err: any) {
      showToast(err.message || 'Gagal update user', 'error');
    } finally { setEditSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteUser || deleteConfirm !== deleteUser.name) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/users/${deleteUser.id}`, { method: 'DELETE' });
      showToast(`User ${deleteUser.name} berhasil dihapus`);
      setDeleteUser(null);
      setDeleteConfirm('');
      loadUsers(pagination.page);
    } catch (err: any) {
      showToast(err.message || 'Gagal hapus user', 'error');
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500 mt-0.5">{pagination.total} total users terdaftar</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Cari nama, username, telegram ID..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a2c828] focus:border-transparent" />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a2c828] appearance-none cursor-pointer">
            <option value="">Semua Plan</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-[#a2c828] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Telegram ID</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium text-right">Transaksi</th>
                  <th className="px-4 py-3 font-medium">Bergabung</th>
                  <th className="px-4 py-3 font-medium">Terakhir Aktif</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{u.name}</div>
                      {u.username && <div className="text-xs text-slate-400">@{u.username}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{u.telegram_id}</td>
                    <td className="px-4 py-3">{planBadge(u.plan)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 font-medium">{u.transaction_count}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(u.last_transaction_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { setDeleteUser(u); setDeleteConfirm(''); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Hapus">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                    <UsersIcon size={32} className="mx-auto mb-2 opacity-40" />Tidak ada user ditemukan
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Hal {pagination.page}/{pagination.totalPages} · {pagination.total} users</p>
            <div className="flex gap-1">
              <button onClick={() => loadUsers(pagination.page - 1)} disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button onClick={() => loadUsers(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Edit User</h2>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a2c828]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Plan</label>
              <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a2c828] appearance-none">
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
              ⚠️ Mengubah plan akan otomatis membuat/menghapus subscription user.
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditUser(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
              <button onClick={saveEdit} disabled={editSaving}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{background: 'linear-gradient(135deg, #a2c828, #7d9c1f)'}}>
                {editSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle size={24} />
              <h2 className="text-lg font-bold">Hapus User</h2>
            </div>
            <p className="text-sm text-slate-600">
              Ini akan menghapus <strong>{deleteUser.name}</strong> beserta <strong>semua transaksi, budget, dan data</strong> terkait. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Ketik <strong>{deleteUser.name}</strong> untuk konfirmasi:</label>
              <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" placeholder={deleteUser.name} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setDeleteUser(null); setDeleteConfirm(''); }} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
              <button onClick={handleDelete} disabled={deleting || deleteConfirm !== deleteUser.name}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">{deleting ? 'Menghapus...' : 'Hapus Permanen'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2 animate-slide-up-fade ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
