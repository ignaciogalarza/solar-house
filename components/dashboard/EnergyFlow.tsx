"use client";

interface EnergyFlowProps {
  solarW: number;
  gridW: number;
  consumptionW: number;
  evChargingW: number;
  hotWaterW: number;
  eddiTempC?: number;
}

export function EnergyFlow({
  solarW,
  gridW,
  consumptionW,
  evChargingW,
  hotWaterW,
  eddiTempC = 0,
}: EnergyFlowProps) {
  const isExporting = gridW < 0;
  const absoluteGrid = Math.abs(gridW);

  // Calculate green energy percentage (how much consumption is from solar)
  const solarUsedDirectly = Math.max(0, solarW - Math.max(0, -gridW));
  const greenPercent = consumptionW > 0
    ? Math.min(100, Math.round((solarUsedDirectly / consumptionW) * 100))
    : 0;

  const formatPower = (w: number): string => {
    if (w >= 1000) return `${(w / 1000).toFixed(1)}kW`;
    if (w > 0) return `${Math.round(w)}W`;
    return "—";
  };

  // Star/Pentagon layout - 5 nodes evenly around center
  // Center at (170, 155), radius 95
  const cx = 170, cy = 155, r = 95;
  const nodeR = 24; // node radius
  const hubR = 32; // center hub radius

  // Pentagon positions (clockwise from top)
  const solar = { x: cx, y: cy - r };                           // Top (12 o'clock)
  const home  = { x: cx + r * 0.95, y: cy - r * 0.31 };         // Top-right
  const ev    = { x: cx + r * 0.59, y: cy + r * 0.81 };         // Bottom-right
  const water = { x: cx - r * 0.59, y: cy + r * 0.81 };         // Bottom-left
  const grid  = { x: cx - r * 0.95, y: cy - r * 0.31 };         // Top-left

  return (
    <div className="bg-[#1E293B] rounded-2xl p-5">
      <h2 className="text-sm font-medium text-[#94A3B8] mb-3">Energy Flow</h2>

      <svg viewBox="0 0 340 310" className="w-full">
        <defs>
          <style>{`
            @keyframes flowForward {
              0% { stroke-dashoffset: 20; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes flowBackward {
              0% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: 20; }
            }
            .flow-in {
              stroke-dasharray: 8 12;
              stroke-linecap: round;
              animation: flowForward 1s ease-in-out infinite;
            }
            .flow-out {
              stroke-dasharray: 8 12;
              stroke-linecap: round;
              animation: flowBackward 1s ease-in-out infinite;
            }
          `}</style>
          <filter id="greenGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* === FLOW LINES (behind nodes) === */}

        {/* Solar → Center */}
        <line
          x1={solar.x} y1={solar.y + nodeR}
          x2={cx} y2={cy - hubR}
          stroke="#F59E0B"
          strokeWidth="3"
          opacity={solarW > 50 ? 1 : 0.2}
          className={solarW > 50 ? "flow-in" : ""}
        />

        {/* Grid ↔ Center */}
        <line
          x1={grid.x + nodeR * 0.95} y1={grid.y + nodeR * 0.31}
          x2={cx - hubR * 0.95} y2={cy - hubR * 0.31}
          stroke={isExporting ? "#10B981" : "#EF4444"}
          strokeWidth="3"
          opacity={absoluteGrid > 50 ? 1 : 0.2}
          className={absoluteGrid > 50 ? (isExporting ? "flow-out" : "flow-in") : ""}
        />

        {/* Center → Home (flows towards home) */}
        <line
          x1={cx + hubR * 0.95} y1={cy - hubR * 0.31}
          x2={home.x - nodeR * 0.95} y2={home.y + nodeR * 0.31}
          stroke="#3B82F6"
          strokeWidth="3"
          opacity={consumptionW > 50 ? 1 : 0.2}
          className={consumptionW > 50 ? "flow-in" : ""}
        />

        {/* Center → EV (flows towards EV) */}
        <line
          x1={cx + hubR * 0.59} y1={cy + hubR * 0.81}
          x2={ev.x - nodeR * 0.59} y2={ev.y - nodeR * 0.81}
          stroke="#8B5CF6"
          strokeWidth="3"
          opacity={evChargingW > 50 ? 1 : 0.2}
          className={evChargingW > 50 ? "flow-in" : ""}
        />

        {/* Center → Water (flows towards water) */}
        <line
          x1={cx - hubR * 0.59} y1={cy + hubR * 0.81}
          x2={water.x + nodeR * 0.59} y2={water.y - nodeR * 0.81}
          stroke="#EC4899"
          strokeWidth="3"
          opacity={hotWaterW > 50 ? 1 : 0.2}
          className={hotWaterW > 50 ? "flow-in" : ""}
        />

        {/* === CENTER HUB (Green % indicator) === */}
        <g filter={greenPercent > 0 ? "url(#greenGlow)" : undefined}>
          <circle
            cx={cx} cy={cy} r={hubR}
            fill="#0F172A"
            stroke="#10B981"
            strokeWidth="3"
            opacity={greenPercent > 0 ? 1 : 0.5}
          />
          {/* Progress ring */}
          <circle
            cx={cx} cy={cy} r={hubR - 6}
            fill="none"
            stroke="#1F2937"
            strokeWidth="5"
          />
          <circle
            cx={cx} cy={cy} r={hubR - 6}
            fill="none"
            stroke="#10B981"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${greenPercent * 1.63} 163`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <text x={cx} y={cy - 1} textAnchor="middle" fill="#10B981" fontSize="16" fontWeight="700">
            {greenPercent}%
          </text>
          <text x={cx} y={cy + 11} textAnchor="middle" fill="#64748B" fontSize="8" fontWeight="500">
            GREEN
          </text>
        </g>

        {/* === SOLAR NODE (top) === */}
        <g>
          <circle cx={solar.x} cy={solar.y} r={nodeR} fill="#0F172A" stroke="#F59E0B" strokeWidth="2" />
          <g transform={`translate(${solar.x - 11}, ${solar.y - 11})`}>
            <circle cx="11" cy="11" r="6" fill="#F59E0B" />
            <path d="M11 2v3M11 17v3M2 11h3M17 11h3M4.5 4.5l2 2M15.5 15.5l2 2M4.5 17.5l2-2M15.5 6.5l2-2"
                  stroke="#F59E0B" strokeWidth="1.5" fill="none" />
          </g>
          <text x={solar.x - 30} y={solar.y - 5} textAnchor="end" fill="#F59E0B" fontSize="11" fontWeight="600">SOLAR</text>
          <text x={solar.x - 30} y={solar.y + 9} textAnchor="end" fill="#F8FAFC" fontSize="13" fontWeight="700">
            {formatPower(solarW)}
          </text>
        </g>

        {/* === HOME NODE (top-right) === */}
        <g>
          <circle cx={home.x} cy={home.y} r={nodeR} fill="#0F172A" stroke="#3B82F6" strokeWidth="2" />
          <g transform={`translate(${home.x - 11}, ${home.y - 10})`}>
            <path d="M11 2L2 10h2v8h5v-5h4v5h5v-8h2L11 2z" fill="#3B82F6" />
          </g>
          <text x={home.x + 30} y={home.y - 5} textAnchor="start" fill="#3B82F6" fontSize="11" fontWeight="600">HOME</text>
          <text x={home.x + 30} y={home.y + 9} textAnchor="start" fill="#F8FAFC" fontSize="13" fontWeight="700">
            {formatPower(consumptionW)}
          </text>
        </g>

        {/* === EV NODE (bottom-right) === */}
        <g opacity={evChargingW > 50 ? 1 : 0.5}>
          <circle cx={ev.x} cy={ev.y} r={nodeR} fill="#0F172A" stroke="#8B5CF6" strokeWidth="2" />
          <g transform={`translate(${ev.x - 10}, ${ev.y - 12})`}>
            <path d="M10 0L2 11h6l-1 9 10-13h-6l1-7z" fill="#8B5CF6" />
          </g>
          <text x={ev.x + 30} y={ev.y - 5} textAnchor="start" fill="#8B5CF6" fontSize="11" fontWeight="600">EV</text>
          <text x={ev.x + 30} y={ev.y + 9} textAnchor="start" fill={evChargingW > 50 ? "#F8FAFC" : "#64748B"}
                fontSize="13" fontWeight="700">
            {evChargingW > 50 ? formatPower(evChargingW) : "Idle"}
          </text>
        </g>

        {/* === WATER NODE (bottom-left) === */}
        <g opacity={hotWaterW > 50 ? 1 : 0.5}>
          <circle cx={water.x} cy={water.y} r={nodeR} fill="#0F172A" stroke="#EC4899" strokeWidth="2" />
          <g transform={`translate(${water.x - 10}, ${water.y - 12})`}>
            <path d="M10 0C5 5 1 10 1 15a9 9 0 1 0 18 0c0-5-4-10-9-15z" fill="#EC4899" />
          </g>
          <text x={water.x - 30} y={water.y - 5} textAnchor="end" fill="#EC4899" fontSize="11" fontWeight="600">WATER</text>
          <text x={water.x - 30} y={water.y + 9} textAnchor="end" fill="#F8FAFC" fontSize="13" fontWeight="700">
            {eddiTempC > 0 ? `${eddiTempC}°C` : "—"}
          </text>
        </g>

        {/* === GRID NODE (top-left) === */}
        <g opacity={absoluteGrid > 50 ? 1 : 0.5}>
          <circle cx={grid.x} cy={grid.y} r={nodeR} fill="#0F172A"
                  stroke={isExporting ? "#10B981" : "#EF4444"} strokeWidth="2" />
          <g transform={`translate(${grid.x - 11}, ${grid.y - 11})`} fill={isExporting ? "#10B981" : "#EF4444"}>
            <rect x="0" y="0" width="9" height="9" rx="1" />
            <rect x="13" y="0" width="9" height="9" rx="1" />
            <rect x="0" y="13" width="9" height="9" rx="1" />
            <rect x="13" y="13" width="9" height="9" rx="1" />
          </g>
          <text x={grid.x - 30} y={grid.y - 5} textAnchor="end" fill={isExporting ? "#10B981" : "#EF4444"}
                fontSize="11" fontWeight="600">GRID</text>
          <text x={grid.x - 30} y={grid.y + 9} textAnchor="end" fill="#F8FAFC" fontSize="13" fontWeight="700">
            {isExporting ? "↑" : "↓"}{formatPower(absoluteGrid)}
          </text>
        </g>

      </svg>
    </div>
  );
}
