interface UsageSummaryProps {
  importKwh: number;
  exportKwh: number;
  generationKwh: number;
}

export function UsageSummary({
  importKwh,
  exportKwh,
  generationKwh,
}: UsageSummaryProps) {
  return (
    <div className="bg-[#1E293B] rounded-2xl p-4">
      <h3 className="text-sm font-medium text-[#94A3B8] mb-3">Your Usage</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-xl font-semibold text-[#EF4444]">
            {importKwh.toFixed(1)}
          </div>
          <div className="text-xs text-[#94A3B8]">kWh imported</div>
        </div>
        <div>
          <div className="text-xl font-semibold text-[#10B981]">
            {exportKwh.toFixed(1)}
          </div>
          <div className="text-xs text-[#94A3B8]">kWh exported</div>
        </div>
        <div>
          <div className="text-xl font-semibold text-[#F59E0B]">
            {generationKwh.toFixed(1)}
          </div>
          <div className="text-xs text-[#94A3B8]">kWh generated</div>
        </div>
      </div>
    </div>
  );
}
