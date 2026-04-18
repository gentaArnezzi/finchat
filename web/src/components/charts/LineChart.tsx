'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface TrendDataItem {
  date: string;
  income: number;
  expense: number;
}

interface TrendLineChartProps {
  data: TrendDataItem[];
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
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name === 'income' ? '💰 Pemasukan' : '💸 Pengeluaran'}:{' '}
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function TrendLineChart({ data, title }: TrendLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Tidak ada data
      </div>
    );
  }

  const formattedData = data.map(item => ({
    ...item,
    dateLabel: new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
  }));

  return (
    <div>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLineChart data={formattedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatRupiah}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value: string) => (value === 'income' ? 'Pemasukan' : 'Pengeluaran')}
          />
          <Line
            type="monotone"
            dataKey="expense"
            stroke="#FF6B6B"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#FF6B6B' }}
            activeDot={{ r: 5 }}
            animationDuration={800}
          />
          <Line
            type="monotone"
            dataKey="income"
            stroke="#10B981"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#10B981' }}
            activeDot={{ r: 5 }}
            animationDuration={800}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
