'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Check, HelpCircle, Zap, ShieldCheck, Activity } from 'lucide-react';

const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(amount);
};

interface Plan {
  id: string;
  name: string;
  price: number;
  priceAnnual?: number;
  priceFormatted: string;
  txLimit: number;
  features: string[];
}

export default function UpgradePage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        api.getPlans(),
        api.getSubscriptionStatus(),
      ]);
      setPlans(plansRes.plans);
      setSubscription(subRes.subscription);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') return;
    
    setProcessingPlan(planId);
    try {
      const res = await api.createPayment(planId, annual);
      const { payment } = res;

      if (payment.snapUrl) {
        window.location.href = payment.snapUrl;
      } else if (payment.mode === 'development') {
        const planNames: Record<string, string> = {
          'pro': 'Pro',
          'business': 'Business'
        };
        const planName = planNames[planId] || planId;
        if (confirm(`Midtrans belum dikonfigurasi. Aktifkan plan ${planName} secara langsung?`)) {
          await api.devActivatePlan(planId);
          alert(`✅ Plan ${planName} berhasil diaktifkan!`);
          loadData();
        }
      }
    } catch (error) {
      alert('Gagal membuat pembayaran. Coba lagi.');
    } finally {
      setProcessingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'free';

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Upgrade Plan</h1>
        <p className="text-gray-500 mt-2">Pilih plan yang sesuai kebutuhanmu</p>
      </div>

      {/* Annual Toggle */}
      {plans.some(p => p.price > 0) && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-3 p-1 rounded-full bg-slate-100 border border-slate-200">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Tahunan
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">Hemat 17%</span>
            </button>
          </div>
        </div>
      )}

      {/* Current Plan Banner */}
      <div className="bg-gradient-to-br from-indigo-600 to-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-900/10">
        <div className="relative z-10 text-center">
          <p className="text-sm text-indigo-200 font-medium tracking-wide uppercase">Plan Saat Ini</p>
          <p className="text-3xl font-extrabold mt-2 text-white">{subscription?.planName || 'Free'}</p>
          {subscription?.transactionUsage && (
            <div className="flex items-center justify-center gap-2 mt-4 text-indigo-100 bg-white/10 w-fit mx-auto px-4 py-2 rounded-full backdrop-blur-sm">
              <Activity size={16} />
              <span className="font-medium">{subscription.transactionUsage.used} / {subscription.transactionUsage.limit} transaksi bulan ini</span>
            </div>
          )}
          {subscription?.expiresAt && (
            <div className="flex items-center justify-center gap-2 mt-3 text-sm text-indigo-200">
              <ShieldCheck size={16} />
              <span>Berlaku sampai {new Date(subscription.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isPopular = plan.id === 'pro';

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-sm border p-8 flex flex-col transition-all hover:shadow-xl ${
                isPopular ? 'border-indigo-600 ring-1 ring-indigo-600 scale-[1.02]' : 'border-slate-200 hover:border-slate-300'
              } ${isCurrent ? 'bg-slate-50' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                  <Zap size={14} /> POPULER
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <div className="mt-4">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-extrabold text-slate-900">Gratis</span>
                  ) : annual && plan.priceAnnual ? (
                    <div className="flex flex-col items-center">
                      <span className="text-4xl font-extrabold text-slate-900">{formatRupiah(plan.priceAnnual)}</span>
                      <span className="text-slate-500 text-sm">/tahun</span>
                      <span className="text-xs text-emerald-600 font-medium mt-1">Hemat {formatRupiah(plan.price * 12 - plan.priceAnnual)}/tahun</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">{formatRupiah(plan.price)}</span>
                      <span className="text-slate-500 font-medium">/bln</span>
                    </div>
                  )}
                </div>
              </div>

              <ul className="space-y-4 flex-grow mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600 leading-snug">
                    <Check size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrent || plan.price === 0 || processingPlan !== null}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all focus:ring-2 focus:ring-offset-2 ${
                  isCurrent || plan.price === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed hidden'
                    : isPopular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-600 shadow-md shadow-indigo-200'
                    : 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900 shadow-sm'
                } ${processingPlan === plan.id ? 'opacity-70 cursor-wait' : ''}`}
                style={{ display: (isCurrent || plan.price === 0) ? 'none' : 'block' }}
              >
                {processingPlan === plan.id ? 'Memproses...' : `Upgrade ${plan.name}`}
              </button>
              
              {(isCurrent || plan.price === 0) && (
                <div className="w-full py-3.5 rounded-xl font-medium text-sm text-center bg-slate-100 text-slate-500 flex items-center justify-center gap-2">
                  {isCurrent ? <><Check size={16} /> Plan Aktif</> : 'Default Plan'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mt-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-slate-100 rounded-lg">
            <HelpCircle size={24} className="text-slate-700" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-semibold text-slate-900">Bagaimana cara upgrade?</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">Klik tombol upgrade, Anda akan diarahkan ke halaman pembayaran Midtrans. Setelah pembayaran berhasil, plan otomatis aktif.</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-semibold text-slate-900">Bisa downgrade?</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">Plan otomatis kembali ke Free setelah masa aktif Business berakhir (1 bulan).</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-semibold text-slate-900">Metode pembayaran apa saja?</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">Transfer bank, e-wallet (GoPay, OVO, DANA), kartu kredit/debit, QRIS, dan minimarket payment.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
