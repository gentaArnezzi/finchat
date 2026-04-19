'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Bell, Clock, Calendar, ShieldAlert, Save, Loader2, CheckCircle2, Tags, Plus, Trash2, Lock } from 'lucide-react';
import Link from 'next/link';

interface Preferences {
  daily_reminder: boolean;
  reminder_time: string;
  weekly_summary: boolean;
  monthly_report: boolean;
  budget_alerts: boolean;
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Category State
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [deletingCat, setDeletingCat] = useState<string | null>(null);
  const [hasCategoryAccess, setHasCategoryAccess] = useState<boolean | null>(null);

  const loadPreferences = useCallback(async () => {
    try {
      const res = await api.getPreferences();
      if (res.preferences) {
        setPrefs({
          daily_reminder: res.preferences.daily_reminder || false,
          reminder_time: res.preferences.reminder_time || '21:00',
          weekly_summary: res.preferences.weekly_summary || false,
          monthly_report: res.preferences.monthly_report || false,
          budget_alerts: res.preferences.budget_alerts !== false, // default true
        });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
    loadCategories();
    checkCategoryAccess();
  }, [loadPreferences]);

  const checkCategoryAccess = async () => {
    try {
      const res = await api.checkFeature('custom_categories');
      setHasCategoryAccess(res.hasAccess);
    } catch {
      setHasCategoryAccess(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.getCategories();
      if (res.categories) {
        setCategories(res.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const res = await api.createCategory({ name: newCatName.trim(), icon: '📦' });
      if (res.success && res.category) {
        setCategories([...categories, res.category].sort((a, b) => b.is_default - a.is_default));
        setNewCatName('');
      }
    } catch (e: any) {
      if (e.message?.includes('Custom Categories') || e.message?.includes('Business')) {
        alert(e.message);
      } else {
        alert("Gagal menambahkan kategori.");
      }
    } finally {
      setAddingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kategori ini?')) return;
    setDeletingCat(id);
    try {
      const res = await api.deleteCategory(id);
      if (res.success) {
        setCategories(categories.filter(c => c.id !== id));
      }
    } catch (e: any) {
       alert("Gagal menghapus kategori.");
    } finally {
      setDeletingCat(null);
    }
  };

  const handleToggle = (key: keyof Preferences) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: !prefs[key] });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!prefs) return;
    setPrefs({ ...prefs, reminder_time: e.target.value });
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    setSavedSuccess(false);
    try {
      await api.updatePreferences(prefs);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pengaturan Sistem</h1>
        <p className="text-slate-500 text-sm mt-1">
          Kelola preferensi notifikasi dan laporan otomatis dari Telegram Bot Anda.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
            <Bell size={20} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Notifikasi & Pengingat</h2>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Daily Reminder */}
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-4">
              <h3 className="font-medium text-slate-900 flex items-center gap-2">
                Pengingat Harian
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Bot akan mengirimkan pesan pengingat setiap malam agar Anda tidak lupa mencatat pengeluaran hari ini.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={prefs.daily_reminder}
                onChange={() => handleToggle('daily_reminder')}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Time Picker (Shown only if Daily Reminder is ON) */}
          {prefs.daily_reminder && (
            <div className="ml-0 md:ml-8 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-700">Jam Pengingat</span>
              </div>
              <select
                value={prefs.reminder_time}
                onChange={handleTimeChange}
                className="bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-3 py-1.5 outline-none font-medium"
              >
                <option value="18:00">18:00</option>
                <option value="19:00">19:00</option>
                <option value="20:00">20:00</option>
                <option value="21:00">21:00</option>
                <option value="22:00">22:00</option>
              </select>
            </div>
          )}

          <hr className="border-slate-100" />

          {/* Budget Alert */}
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-4">
              <h3 className="font-medium text-slate-900 flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-500" /> Peringatan Budget
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Dapatkan notifikasi darurat saat pengeluaran kategori Anda telah mendekati atau melebihi ambang batas (limit) bulanan.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={prefs.budget_alerts}
                onChange={() => handleToggle('budget_alerts')}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>

          <hr className="border-slate-100" />

          {/* Weekly Summary */}
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-4">
              <h3 className="font-medium text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-500" /> Ringkasan Mingguan
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Terima rekapitulasi pengeluaran dan pemasukan mingguan setiap hari Senin pagi.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={prefs.weekly_summary}
                onChange={() => handleToggle('weekly_summary')}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Monthly Report */}
          <div className="flex items-start justify-between mt-6">
            <div className="space-y-1 pr-4">
              <h3 className="font-medium text-slate-900 flex items-center gap-2">
                Laporan Bulanan Lengkap
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Terima analisis komprehensif terkait performa kesehatan finansial Anda pada tanggal 1 setiap bulannya.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={prefs.monthly_report}
                onChange={() => handleToggle('monthly_report')}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-sm text-slate-500 font-medium">Perubahan mungkin membutuhkan beberapa waktu untuk terhubung ke Telegram Server.</p>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm
              ${savedSuccess 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'}
              disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            {saving ? (
              <><Loader2 size={18} className="animate-spin" /> Menyimpan...</>
            ) : savedSuccess ? (
              <><CheckCircle2 size={18} /> Tersimpan!</>
            ) : (
              <><Save size={18} /> Simpan Pengaturan</>
            )}
          </button>
        </div>
      </div>

      {/* Category Management Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
              <Tags size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Kategori Custom (Pro)</h2>
              <p className="text-sm text-slate-500">Kustomisasi pencatatan pengeluaran Anda.</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          {hasCategoryAccess === false ? (
            <div className="text-center py-8">
              <Lock size={32} className="mx-auto text-slate-300 mb-3" />
<p className="text-slate-500 text-sm mb-4">Fitur Custom Categories hanya tersedia di plan <b>Business</b>.</p>
                
                Upgrade ke Business
              </Link>
            </div>
          ) : (
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Contoh: Belanja Online..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm font-medium"
            />
            <button
              onClick={handleAddCategory}
              disabled={addingCat || !newCatName.trim()}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingCat ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Buat Kategori
            </button>
          </div>
          )}

          <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
            {categories.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6">Kategori masih kosong.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <li key={cat.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: cat.color ? cat.color + '20' : '#f1f5f9', color: cat.color || '#475569' }}>
                        {cat.icon || '📦'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                          {cat.name} 
                          {cat.is_default && <span className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">Default</span>}
                        </p>
                      </div>
                    </div>
                    {!cat.is_default && (
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        disabled={deletingCat === cat.id}
                        className="mt-3 sm:mt-0 px-3 py-1.5 text-xs font-bold text-rose-500 border border-rose-100 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5 w-fit"
                      >
                        {deletingCat === cat.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Hapus
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
