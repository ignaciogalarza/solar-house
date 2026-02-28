"use client";

interface TodaySummaryProps {
  generatedKwh: number;
  consumedKwh: number;
  exportedKwh: number;
  importedKwh: number;
  exportRate?: number;
  importRate?: number;
  estimatedBill?: number | null;
}

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  color: string;
  subColor?: string;
}

function StatCard({ label, value, subValue, color, subColor }: StatCardProps) {
  return (
    <div className="bg-[#0F172A] rounded-xl p-3.5 border border-white/5">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: color }} />
        <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <div className="text-xl font-bold text-[#F8FAFC] tabular-nums">{value}</div>
      {subValue && (
        <div className={`text-xs font-medium mt-0.5`} style={{ color: subColor || color }}>
          {subValue}
        </div>
      )}
    </div>
  );
}

export function TodaySummary({
  generatedKwh,
  consumedKwh,
  exportedKwh,
  importedKwh,
  exportRate = 0.1,
  importRate = 0.3,
  estimatedBill = null,
}: TodaySummaryProps) {
  const exportEarnings = exportedKwh * exportRate;
  const importCost = importedKwh * importRate;

  // Self-consumption = solar used directly / total solar
  const selfConsumption =
    generatedKwh > 0
      ? Math.round(((generatedKwh - exportedKwh) / generatedKwh) * 100)
      : 0;

  // Self-sufficiency = solar used directly / total consumption
  const selfSufficiency =
    consumedKwh > 0
      ? Math.round(((consumedKwh - importedKwh) / consumedKwh) * 100)
      : 0;

  const today = new Date().toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bg-[#1E293B] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#F8FAFC]">Today</h2>
        <span className="text-xs text-[#64748B]">{today}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Generated"
          value={`${generatedKwh.toFixed(1)} kWh`}
          color="#F59E0B"
        />
        <StatCard
          label="Consumed"
          value={`${consumedKwh.toFixed(1)} kWh`}
          color="#3B82F6"
        />
        <StatCard
          label="Exported"
          value={`${exportedKwh.toFixed(1)} kWh`}
          subValue={`€${exportEarnings.toFixed(2)} earned`}
          color="#10B981"
        />
        <StatCard
          label="Imported"
          value={`${importedKwh.toFixed(1)} kWh`}
          subValue={`€${importCost.toFixed(2)} cost`}
          color="#EF4444"
        />
      </div>

      {/* Bill estimate */}
      {estimatedBill !== null && estimatedBill !== undefined && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#64748B] uppercase tracking-wider font-medium">
              Estimated Daily Bill
            </span>
            <span className="text-lg font-bold text-[#F8FAFC] tabular-nums">
              €{estimatedBill.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Self metrics */}
      <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-2">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#1F2937"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="3"
                strokeDasharray={`${selfConsumption} ${100 - selfConsumption}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-[#F59E0B]">{selfConsumption}%</span>
            </div>
          </div>
          <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-medium">
            Self-consumption
          </div>
        </div>
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-2">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#1F2937"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeDasharray={`${selfSufficiency} ${100 - selfSufficiency}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-[#10B981]">{selfSufficiency}%</span>
            </div>
          </div>
          <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-medium">
            Self-sufficiency
          </div>
        </div>
      </div>
    </div>
  );
}