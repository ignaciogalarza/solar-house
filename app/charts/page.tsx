'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

export default function ChartsPage() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [readings, setReadings] = useState<HourlyReading[] | DailyReading[]>([]);
  const [totals, setTotals] = useState<DailyTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() - getDaysToAdd());
    setDate(currentDate.toISOString().split('T')[0]);
  };

  const handleNextDate = () => {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + getDaysToAdd());
    setDate(currentDate.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setDate(new Date().toISOString().split('T')[0]);
  };

  const isToday = date === new Date().toISOString().split('T')[0];

  const getDateRangeText = () => {
    const currentDate = new Date(date + 'T00:00:00');
    
    switch (period) {
      case 'day':
        return currentDate.toLocaleDateString('en-US', {
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
        
        const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  const getPeriodLabel = () => {
    switch (period) {
      case 'day': return 'Selected Date';
      case 'week': return 'Selected Week';
      case 'month': return 'Selected Month';
      case 'year': return 'Selected Year';
      default: return 'Selected Date';
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

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header with Date Navigation */}
      <div className="bg-[#1E293B] rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevDate}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Previous period"
          >
            <ChevronLeft className="w-5 h-5 text-[#94A3B8]" />
          </button>

          <div className="flex flex-col items-center">
            <p className="text-sm text-[#94A3B8]">{getPeriodLabel()}</p>
            <p className="text-lg font-semibold text-[#F8FAFC] text-center">
              {getDateRangeText()}
            </p>
            {!isToday && (
              <button
                onClick={handleToday}
                className="text-xs text-[#F59E0B] hover:text-[#FBBF24] mt-1 transition-colors"
              >
                Go to Today
              </button>
            )}
          </div>

          <button
            onClick={handleNextDate}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Next period"
          >
            <ChevronRight className="w-5 h-5 text-[#94A3B8]" />
          </button>
        </div>
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
