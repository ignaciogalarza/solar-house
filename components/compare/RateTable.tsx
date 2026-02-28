interface RatePeriod {
  name: string;
  rate: number;
}

interface TariffRow {
  providerName: string;
  exportRate: number | null;
  periods: RatePeriod[];
  isBest: boolean;
}

interface RateTableProps {
  tariffs: TariffRow[];
}

export function RateTable({ tariffs }: RateTableProps) {
  const getDayRate = (periods: RatePeriod[]): string => {
    const dayPeriod = periods.find(
      (p) => p.name.toLowerCase() === "day"
    );
    if (dayPeriod) return `€${dayPeriod.rate.toFixed(3)}`;
    if (periods.length > 0) return `€${periods[0].rate.toFixed(3)}`;
    return "—";
  };

  const getNightRate = (periods: RatePeriod[]): string => {
    const nightPeriod = periods.find(
      (p) => p.name.toLowerCase() === "night"
    );
    return nightPeriod ? `€${nightPeriod.rate.toFixed(3)}` : "—";
  };

  return (
    <div className="bg-[#1E293B] rounded-2xl p-4">
      <h3 className="text-sm font-medium text-[#94A3B8] mb-3">
        Rate Comparison
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm divide-y divide-slate-700">
          <thead>
            <tr>
              <th className="text-[#94A3B8] text-xs font-medium text-left py-2">
                Provider
              </th>
              <th className="text-[#94A3B8] text-xs font-medium text-right py-2 px-3">
                Day
              </th>
              <th className="text-[#94A3B8] text-xs font-medium text-right py-2 px-3">
                Night
              </th>
              <th className="text-[#94A3B8] text-xs font-medium text-right py-2">
                Export
              </th>
            </tr>
          </thead>
          <tbody>
            {tariffs.map((tariff, index) => (
              <tr key={index}>
                <td
                  className={`py-2 ${
                    tariff.isBest
                      ? "font-bold text-[#10B981]"
                      : "font-semibold"
                  }`}
                >
                  {tariff.providerName}
                </td>
                <td className="text-right py-2 px-3">
                  {getDayRate(tariff.periods)}
                </td>
                <td className="text-right py-2 px-3">
                  {getNightRate(tariff.periods)}
                </td>
                <td className="text-right py-2 text-[#10B981]">
                  {tariff.exportRate !== null
                    ? `€${tariff.exportRate.toFixed(3)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
