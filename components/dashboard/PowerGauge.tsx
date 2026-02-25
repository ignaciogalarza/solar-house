"use client";

interface PowerGaugeProps {
  solarW: number;
  gridW: number;
  consumptionW: number;
  generatedKwh: number;
  consumedKwh: number;
  exportedKwh: number;
  importedKwh: number;
}

export function PowerGauge({
  solarW,
  gridW,
  consumptionW,
  generatedKwh,
  consumedKwh,
  exportedKwh,
  importedKwh,
}: PowerGaugeProps) {
  const isExporting = gridW < 0;
  const absoluteGridW = Math.abs(gridW);

  // Self-consumed solar = generation - export
  const selfConsumedKwh = Math.max(0, generatedKwh - exportedKwh);

  // Total for the gauge = consumption + export (everything that was generated/imported)
  const totalKwh = consumedKwh + exportedKwh;

  // Percentages of total (ensure they sum to 100)
  const solarRaw = totalKwh > 0 ? (selfConsumedKwh / totalKwh) * 100 : 0;
  const exportRaw = totalKwh > 0 ? (exportedKwh / totalKwh) * 100 : 0;
  const gridRaw = totalKwh > 0 ? (importedKwh / totalKwh) * 100 : 0;

  const solarPercent = Math.round(solarRaw);
  const exportPercent = Math.round(exportRaw);
  const gridPercent = Math.max(0, 100 - solarPercent - exportPercent); // Remainder to ensure 100%

  // Gauge SVG parameters
  const cx = 170;
  const cy = 150;
  const radius = 110;
  const strokeWidth = 28;

  // Full circumference and half for calculations
  const fullCircumference = 2 * Math.PI * radius;
  const halfCircumference = Math.PI * radius;

  // Calculate dash arrays for stacked segments (use full circumference to prevent repeat)
  // Solar segment (amber)
  const solarLength = (solarPercent / 100) * halfCircumference;

  // Export segment (green) - starts after solar
  const exportLength = (exportPercent / 100) * halfCircumference;
  const exportOffset = -solarLength;

  // Grid segment (red) - starts after solar + export
  const gridLength = (gridPercent / 100) * halfCircumference;
  const gridOffset = -(solarLength + exportLength);

  const formatPower = (w: number) => (w / 1000).toFixed(1);

  return (
    <div className="bg-[#1E293B] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-[#94A3B8]">Today's Energy</h2>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-xs text-[#94A3B8]">Live</span>
        </div>
      </div>

      <div className="relative flex justify-center">
        <svg viewBox="0 0 340 200" className="w-full max-w-[340px]">
          <defs>
            <linearGradient id="solarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
            <linearGradient id="gridGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#F87171" />
            </linearGradient>
          </defs>

          {/* Background arc - semi circle only */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#1F2937"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />

          {/* Solar segment (amber) - starts from left */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="url(#solarGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${solarLength} ${fullCircumference}`}
            strokeDashoffset={0}
            transform={`rotate(180 ${cx} ${cy})`}
          />

          {/* Export segment (green) - starts after solar */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#10B981"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeDasharray={`${exportLength} ${fullCircumference}`}
            strokeDashoffset={exportOffset}
            transform={`rotate(180 ${cx} ${cy})`}
          />

          {/* Grid segment (red) - starts after solar + export */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="url(#gridGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeDasharray={`${gridLength} ${fullCircumference}`}
            strokeDashoffset={gridOffset}
            transform={`rotate(180 ${cx} ${cy})`}
          />

          {/* End cap - rounded end at right side of arc */}
          <circle
            cx={cx + radius}
            cy={cy}
            r={strokeWidth / 2}
            fill="#F87171"
          />

          {/* Center content */}
          <text x={cx} y={cy - 25} textAnchor="middle" fill="#F8FAFC" fontSize="36" fontWeight="700">
            {formatPower(consumptionW)}
          </text>
          <text x={cx} y={cy - 5} textAnchor="middle" fill="#94A3B8" fontSize="14">
            kW using
          </text>
          <text
            x={cx}
            y={cy + 18}
            textAnchor="middle"
            fill={isExporting ? "#10B981" : "#EF4444"}
            fontSize="13"
            fontWeight="600"
          >
            {isExporting ? `↑ Exporting ${formatPower(absoluteGridW)}kW` : `↓ Importing ${formatPower(absoluteGridW)}kW`}
          </text>

          {/* Legend */}
          <g transform={`translate(${cx - 120}, ${cy + 35})`}>
            <circle cx={0} cy={0} r={5} fill="#F59E0B" />
            <text x={10} y={4} fill="#F8FAFC" fontSize="11">{solarPercent}% Solar</text>

            <circle cx={80} cy={0} r={5} fill="#10B981" />
            <text x={90} y={4} fill="#F8FAFC" fontSize="11">{exportPercent}% Exp</text>

            <circle cx={150} cy={0} r={5} fill="#EF4444" />
            <text x={160} y={4} fill="#F8FAFC" fontSize="11">{gridPercent}% Grid</text>
          </g>
        </svg>
      </div>

      {/* Bottom KPI cards */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        <div className="text-center p-2 bg-[#0F172A] rounded-xl border border-[#F59E0B]/20">
          <div className="text-[#F59E0B] text-lg font-bold tabular-nums">{generatedKwh.toFixed(1)}</div>
          <div className="text-[9px] text-[#94A3B8] uppercase tracking-wide">Gen kWh</div>
        </div>
        <div className="text-center p-2 bg-[#0F172A] rounded-xl border border-[#3B82F6]/20">
          <div className="text-[#3B82F6] text-lg font-bold tabular-nums">{consumedKwh.toFixed(1)}</div>
          <div className="text-[9px] text-[#94A3B8] uppercase tracking-wide">Used kWh</div>
        </div>
        <div className="text-center p-2 bg-[#0F172A] rounded-xl border border-[#10B981]/20">
          <div className="text-[#10B981] text-lg font-bold tabular-nums">{exportedKwh.toFixed(1)}</div>
          <div className="text-[9px] text-[#94A3B8] uppercase tracking-wide">Exp kWh</div>
        </div>
        <div className="text-center p-2 bg-[#0F172A] rounded-xl border border-[#EF4444]/20">
          <div className="text-[#EF4444] text-lg font-bold tabular-nums">{importedKwh.toFixed(1)}</div>
          <div className="text-[9px] text-[#94A3B8] uppercase tracking-wide">Imp kWh</div>
        </div>
      </div>
    </div>
  );
}
