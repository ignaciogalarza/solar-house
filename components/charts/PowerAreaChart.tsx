'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
} from 'recharts';

interface HourlyData {
  hour: number;
  generationKwh: number;
  importKwh: number;
  consumptionKwh: number;
}

interface DailyData {
  date: string;
  generationKwh: number;
  importKwh: number;
  consumptionKwh: number;
}

interface PowerAreaChartProps {
  data: HourlyData[] | DailyData[];
  period?: 'day' | 'week' | 'month' | 'year';
}

export default function PowerAreaChart({ data, period = 'day' }: PowerAreaChartProps) {
  const isHourlyData = (item: HourlyData | DailyData): item is HourlyData => {
    return 'hour' in item;
  };

  const dataKey = data.length > 0 && isHourlyData(data[0]) ? 'hour' : 'date';

  const formatXAxis = (value: string | number) => {
    if (typeof value === 'number') {
      return `${value}h`;
    }
    // For dates, show short format
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTooltipLabel = (value: string | number) => {
    if (typeof value === 'number') {
      return `Hour: ${value}`;
    }
    // For dates, show full format
    const date = new Date(value);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="generationGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="importGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey={dataKey}
          tick={{ fill: '#94A3B8', fontSize: 12 }}
          tickFormatter={formatXAxis}
        />
        <YAxis
          tick={{ fill: '#94A3B8', fontSize: 12 }}
          label={{ value: 'kWh', angle: -90, position: 'insideLeft', fill: '#94A3B8' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            borderRadius: '0.5rem',
            color: '#F1F5F9',
          }}
          labelFormatter={formatTooltipLabel}
          formatter={(value: number, name: string) => {
            const labels: Record<string, string> = {
              generationKwh: 'Generation',
              importKwh: 'Import',
              consumptionKwh: 'Consumption',
            };
            const fixedValue = typeof value === 'number' ? value.toFixed(2) : value;
            return [`${fixedValue} kWh`, labels[name] || name];
          }}
        />
        <Area
          type="monotone"
          dataKey="generationKwh"
          stackId="1"
          stroke="#F59E0B"
          fill="url(#generationGradient)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="importKwh"
          stackId="1"
          stroke="#EF4444"
          fill="url(#importGradient)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="consumptionKwh"
          stroke="#3B82F6"
          fill="none"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
