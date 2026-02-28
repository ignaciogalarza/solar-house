interface SavingsBarProps {
  savings: number;
  maxSavings: number;
}

export function SavingsBar({ savings, maxSavings }: SavingsBarProps) {
  const barPercentage = Math.min(Math.abs(savings) / maxSavings * 100, 100);
  const isPositive = savings > 0;
  const isNeutral = savings === 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-[#0F172A] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isPositive ? "bg-[#10B981]" : isNeutral ? "bg-transparent" : "bg-[#EF4444]"
          }`}
          style={{ width: isNeutral ? "0%" : `${barPercentage}%` }}
        />
      </div>
      <div
        className={`font-semibold text-sm whitespace-nowrap ${
          isPositive
            ? "text-[#10B981]"
            : isNeutral
              ? "text-[#94A3B8]"
              : "text-[#EF4444]"
        }`}
      >
        {isPositive
          ? `Save €${Math.round(savings)}/yr`
          : isNeutral
            ? "Baseline"
            : `€${Math.round(Math.abs(savings))}/yr more`}
      </div>
    </div>
  );
}
