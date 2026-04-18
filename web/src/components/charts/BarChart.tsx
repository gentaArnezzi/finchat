'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface MonthlyDataItem {
  month: string;
  income: number;
  expense: number;
}

interface MonthlyBarChartProps {
  data: MonthlyDataItem[];
  title?: string;
}

const formatRupiah = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
  return String(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-3 border border-gray-100">
        <p className="font-medium text-gray-900 text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.fill }}>
            {entry.name === 'income' ? '💰 Pemasukan' : '💸 Pengeluaran'}:{' '}
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function MonthlyBarChart({ data, title }: MonthlyBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Tidak ada data
      </div>
    );
  }

  return (
    <div>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={320}>
        <RechartsBarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
          <YAxis tickFormatter={formatRupiah} tick={{ fontSize: 11, fill: '#9CA3AF' }} width={60} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value: string) => (value === 'income' ? 'Pemasukan' : 'Pengeluaran')}
          />
          <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} animationDuration={800} />
          <Bar dataKey="expense" fill="#FF6B6B" radius={[4, 4, 0, 0]} barSize={20} animationDuration={800} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
