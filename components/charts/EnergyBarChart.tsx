'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface EnergyBarChartProps {
  data: {
    generationKwh: number;
    consumptionKwh: number;
    exportKwh: number;
    importKwh: number;
  };
}

export default function EnergyBarChart({ data }: EnergyBarChartProps) {
  // Transform single data object into array format for Recharts
  const chartData = [
    {
      label: 'Gen',
      generation: data.generationKwh,
    },
    {
      label: 'Used',
      consumption: data.consumptionKwh,
    },
    {
      label: 'Exp',
      export: data.exportKwh,
    },
    {
      label: 'Imp',
      import: data.importKwh,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis type="number" />
        <YAxis
          dataKey="label"
          type="category"
          tick={{ fill: '#94A3B8', fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            borderRadius: '0.375rem',
            color: '#F1F5F9',
          }}
          formatter={(value) => `${value} kWh`}
        />
        <Bar
          dataKey="generation"
          fill="#F59E0B"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="consumption"
          fill="#3B82F6"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="export"
          fill="#10B981"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="import"
          fill="#EF4444"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
