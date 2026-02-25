"use client";

interface DeviceCardProps {
  name: string;
  type: string;
  status: string;
  detail?: string;
  variant: "zappi" | "eddi" | "harvi";
  isActive?: boolean;
}

const variants = {
  zappi: {
    color: "#8B5CF6",
    bgClass: "bg-purple-500/10 border-purple-500/20",
    textClass: "text-purple-400",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  eddi: {
    color: "#EC4899",
    bgClass: "bg-pink-500/10 border-pink-500/20",
    textClass: "text-pink-400",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    ),
  },
  harvi: {
    color: "#06B6D4",
    bgClass: "bg-cyan-500/10 border-cyan-500/20",
    textClass: "text-cyan-400",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M9 9h6M9 15h6M9 12h6" />
      </svg>
    ),
  },
};

export function DeviceCard({
  name,
  type,
  status,
  detail,
  variant,
  isActive = true,
}: DeviceCardProps) {
  const style = variants[variant];

  return (
    <div
      className={`bg-[#1E293B] rounded-xl p-4 flex items-center justify-between border ${style.bgClass} transition-all hover:border-opacity-40`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-xl ${style.bgClass} border flex items-center justify-center ${style.textClass}`}
        >
          {style.icon}
        </div>
        <div>
          <div className="font-semibold text-[#F8FAFC]">{name}</div>
          <div className="text-xs text-[#64748B]">{type}</div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-semibold ${isActive ? "text-[#F8FAFC]" : "text-[#64748B]"}`}>
          {status}
        </div>
        {detail && (
          <div className={`text-xs ${style.textClass}`}>{detail}</div>
        )}
      </div>
    </div>
  );
}
