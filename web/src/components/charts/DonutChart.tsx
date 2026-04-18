'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DataItem {
  name: string;
  value: number;
  icon?: string;
  color?: string;
}

interface DonutChartProps {
  data: DataItem[];
  title?: string;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#FFEAA7', '#A29BFE', '#74B9FF', '#FD79A8'];

const formatRupiah = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white shadow-lg rounded-lg p-3 border border-gray-100">
        <p className="font-medium text-gray-900 text-sm">{data.payload.icon} {data.name}</p>
        <p className="text-sm text-gray-600">{formatRupiah(data.value)}</p>
        <p className="text-xs text-gray-400">{(data.payload.percent * 100).toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-4">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-1.5 text-xs">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function DonutChart({ data, title }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Tidak ada data
      </div>
    );
  }

  const chartData = data.map((item, i) => ({
    ...item,
    color: item.color || COLORS[i % COLORS.length],
    percent: total > 0 ? item.value / total : 0,
  }));

  return (
    <div>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center mt-2">
        <span className="text-sm text-gray-500">Total: </span>
        <span className="text-sm font-bold text-gray-900">{formatRupiah(total)}</span>
      </div>
    </div>
  );
}
