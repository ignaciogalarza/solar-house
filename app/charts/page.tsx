'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PeriodSelector, PowerAreaChart, EnergyBarChart } from '@/components/charts';

interface EnergyReading {
  timestamp: string;
  power: number;
}

interface EnergyData {
  readings: EnergyReading[];
  totals: {
    production: number;
    consumption: number;
    stored: number;
  };
}

export default function ChartsPage() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<EnergyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/energy/history?period=${period}&date=${date}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch energy data');
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period, date]);

  const handlePrevDate = () => {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() - 1);
    setDate(currentDate.toISOString().split('T')[0]);
  };

  const handleNextDate = () => {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + 1);
    setDate(currentDate.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header with Date Navigation */}
      <div className="bg-[#1E293B] rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevDate}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Previous date"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center">
            <p className="text-sm text-slate-400">Selected Date</p>
            <p className="text-lg font-semibold">
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            {date !== new Date().toISOString().split('T')[0] && (
              <button
                onClick={handleToday}
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors"
              >
                Go to Today
              </button>
            )}
          </div>

          <button
            onClick={handleNextDate}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Next date"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-[#1E293B] rounded-2xl p-5">
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-2xl p-5 text-red-200">
          <p className="text-sm font-medium">Error: {error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="space-y-4">
          <div className="bg-[#1E293B] rounded-2xl p-5 h-80 animate-pulse" />
          <div className="bg-[#1E293B] rounded-2xl p-5 h-80 animate-pulse" />
        </div>
      ) : data ? (
        <>
          {/* Power Area Chart */}
          <div className="bg-[#1E293B] rounded-2xl p-5">
            <h2 className="text-lg font-semibold mb-4">Power Generation</h2>
            <PowerAreaChart data={data.readings} />
          </div>

          {/* Energy Bar Chart */}
          <div className="bg-[#1E293B] rounded-2xl p-5">
            <h2 className="text-lg font-semibold mb-4">Energy Summary</h2>
            <EnergyBarChart data={data.totals} />
          </div>
        </>
      ) : null}
    </div>
  );
}
