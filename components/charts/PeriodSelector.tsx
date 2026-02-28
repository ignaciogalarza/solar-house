import React from 'react';

export interface PeriodSelectorProps {
  selected: 'day' | 'week' | 'month' | 'year' | 'custom';
  onChange: (period: 'day' | 'week' | 'month' | 'year' | 'custom') => void;
}

const periods = [
  { value: 'day' as const, label: 'Day' },
  { value: 'week' as const, label: 'Week' },
  { value: 'month' as const, label: 'Month' },
  { value: 'year' as const, label: 'Year' },
  { value: 'custom' as const, label: 'Custom' },
] as const;

export function PeriodSelector({ selected, onChange }: PeriodSelectorProps) {
  return (
    <div className="bg-[#1E293B] rounded-xl p-1 flex gap-1">
      {periods.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={
            selected === value
              ? 'px-4 py-2 rounded-lg bg-[#F59E0B] text-[#0F172A] text-sm font-medium'
              : 'px-4 py-2 rounded-lg text-[#94A3B8] text-sm'
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}
