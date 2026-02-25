'use client';

import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { PeriodSelector } from '@/components/charts/PeriodSelector';
import PowerAreaChart from '@/components/charts/PowerAreaChart';
import EnergyBarChart from '@/components/charts/EnergyBarChart';

interface HourlyReading {
  hour: number;
  generationKwh: number;
  importKwh: number;
  exportKwh: number;
  consumptionKwh: number;
}

interface DailyReading {
  date: string;
  generationKwh: number;
  importKwh: number;
  exportKwh: number;
  consumptionKwh: number;
}

interface DailyTotals {
  generationKwh: number;
  importKwh: number;
  exportKwh: number;
  consumptionKwh: number;
}

interface ApiResponse {
  success: boolean;
  data?: {
    period: string;
    date: string;
    readings: HourlyReading[] | DailyReading[];
    totals: DailyTotals;
  };
  error?: string;
}

type Period = 'day' | 'week' | 'month' | 'year';

// Helper to get date string
const toDateString = (d: Date) => d.toISOString().split('T')[0];
const today = () => toDateString(new Date());
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateString(d);
};
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
};

interface QuickPreset {
  label: string;
  getDate: () => string;
  period: Period;
}

const quickPresets: QuickPreset[] = [
  { label: 'Today', getDate: today, period: 'day' },
  { label: 'Yesterday', getDate: yesterday, period: 'day' },
  { label: 'Last 7 days', getDate: yesterday, period: 'week' },
  { label: 'Last 30 days', getDate: yesterday, period: 'month' },
];

export default function ChartsPage() {
  const [period, setPeriod] = useState<Period>('day');
  const [date, setDate] = useState<string>(today());
  const [readings, setReadings] = useState<HourlyReading[] | DailyReading[]>([]);
  const [totals, setTotals] = useState<DailyTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/energy/history?period=${period}&date=${date}`);
        const result: ApiResponse = await response.json();

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to fetch energy data');
        }

        setReadings(result.data.readings);
        setTotals(result.data.totals);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setReadings([]);
        setTotals(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period, date]);

  const getDaysToAdd = () => {
    switch (period) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'year': return 365;
      default: return 1;
    }
  };

  const handlePrevDate = () => {
    const currentDate = new Date(date + 'T00:00:00');
    currentDate.setDate(currentDate.getDate() - getDaysToAdd());
    setDate(toDateString(currentDate));
  };

  const handleNextDate = () => {
    const currentDate = new Date(date + 'T00:00:00');
    currentDate.setDate(currentDate.getDate() + getDaysToAdd());
    setDate(toDateString(currentDate));
  };

  const handlePreset = (preset: QuickPreset) => {
    setDate(preset.getDate());
    setPeriod(preset.period);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setDate(e.target.value);
    }
  };

  const openDatePicker = () => {
    dateInputRef.current?.showPicker();
  };

  const isToday = date === today();

  const getDateRangeText = () => {
    const currentDate = new Date(date + 'T00:00:00');

    switch (period) {
      case 'day':
        return currentDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

      case 'week': {
        const endDate = new Date(currentDate);
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - 6);

        const sameYear = startDate.getFullYear() === endDate.getFullYear();
        const sameMonth = startDate.getMonth() === endDate.getMonth();

        if (sameYear && sameMonth) {
          const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const end = endDate.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' });
          return `${start} - ${end}`;
        } else if (sameYear) {
          const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return `${start} - ${end}`;
        } else {
          const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return `${start} - ${end}`;
        }
      }

      case 'month': {
        const endDate = new Date(currentDate);
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - 29);

        const sameYear = startDate.getFullYear() === endDate.getFullYear();

        if (sameYear) {
          const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return `${start} - ${end}`;
        } else {
          const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return `${start} - ${end}`;
        }
      }

      case 'year': {
        const endDate = new Date(currentDate);
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - 364);

        const start = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const end = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        return `${start} - ${end}`;
      }

      default:
        return currentDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
    }
  };

  const getChartTitle = () => {
    switch (period) {
      case 'day': return 'Hourly Power';
      case 'week': return 'Daily Power (7 days)';
      case 'month': return 'Daily Power (30 days)';
      case 'year': return 'Daily Power (365 days)';
      default: return 'Power';
    }
  };

  const getSummaryTitle = () => {
    switch (period) {
      case 'day': return 'Daily Summary';
      case 'week': return 'Weekly Summary';
      case 'month': return 'Monthly Summary';
      case 'year': return 'Yearly Summary';
      default: return 'Summary';
    }
  };

  // Check which preset is currently active
  const getActivePreset = () => {
    for (const preset of quickPresets) {
      if (preset.getDate() === date && preset.period === period) {
        return preset.label;
      }
    }
    return null;
  };

  const activePreset = getActivePreset();

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Date Navigation Header */}
      <div className="bg-[#1E293B] rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevDate}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Previous period"
          >
            <ChevronLeft className="w-5 h-5 text-[#94A3B8]" />
          </button>

          {/* Clickable date - opens calendar */}
          <button
            onClick={openDatePicker}
            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Calendar className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-lg font-semibold text-[#F8FAFC]">
              {getDateRangeText()}
            </span>
          </button>

          <button
            onClick={handleNextDate}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Next period"
          >
            <ChevronRight className="w-5 h-5 text-[#94A3B8]" />
          </button>
        </div>

        {/* Hidden date input */}
        <input
          ref={dateInputRef}
          type="date"
          value={date}
          onChange={handleDateChange}
          max={today()}
          className="sr-only"
        />
      </div>

      {/* Quick Presets */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {quickPresets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              activePreset === preset.label
                ? 'bg-[#F59E0B] text-[#0F172A] font-medium'
                : 'bg-[#1E293B] text-[#94A3B8] hover:bg-slate-700'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Period Selector */}
      <PeriodSelector selected={period} onChange={setPeriod} />

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-2xl p-5 text-red-200">
          <p className="text-sm font-medium">Error: {error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="space-y-4">
          <div className="bg-[#1E293B] rounded-2xl p-5 h-[300px] animate-pulse" />
          <div className="bg-[#1E293B] rounded-2xl p-5 h-[220px] animate-pulse" />
        </div>
      ) : (
        <>
          {/* Cumulative Totals */}
          {totals && (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-[#1E293B] rounded-xl p-3 text-center">
                <div className="text-[#F59E0B] text-xl font-bold tabular-nums">
                  {totals.generationKwh.toFixed(1)}
                </div>
                <div className="text-[10px] text-[#94A3B8] uppercase tracking-wide">Gen kWh</div>
              </div>
              <div className="bg-[#1E293B] rounded-xl p-3 text-center">
                <div className="text-[#3B82F6] text-xl font-bold tabular-nums">
                  {totals.consumptionKwh.toFixed(1)}
                </div>
                <div className="text-[10px] text-[#94A3B8] uppercase tracking-wide">Used kWh</div>
              </div>
              <div className="bg-[#1E293B] rounded-xl p-3 text-center">
                <div className="text-[#10B981] text-xl font-bold tabular-nums">
                  {totals.exportKwh.toFixed(1)}
                </div>
                <div className="text-[10px] text-[#94A3B8] uppercase tracking-wide">Exp kWh</div>
              </div>
              <div className="bg-[#1E293B] rounded-xl p-3 text-center">
                <div className="text-[#EF4444] text-xl font-bold tabular-nums">
                  {totals.importKwh.toFixed(1)}
                </div>
                <div className="text-[10px] text-[#94A3B8] uppercase tracking-wide">Imp kWh</div>
              </div>
            </div>
          )}

          {/* Power Area Chart */}
          <div className="bg-[#1E293B] rounded-2xl p-5">
            <h2 className="text-sm font-medium text-[#94A3B8] mb-4">{getChartTitle()}</h2>
            <PowerAreaChart data={readings} period={period} />
          </div>

          {/* Energy Bar Chart */}
          {totals && (
            <div className="bg-[#1E293B] rounded-2xl p-5">
              <h2 className="text-sm font-medium text-[#94A3B8] mb-4">{getSummaryTitle()}</h2>
              <EnergyBarChart data={totals} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
