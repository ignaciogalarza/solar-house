import { useState } from "react";
import { SavingsBar } from "./SavingsBar";

interface ProviderCardProps {
  tariffId: number;
  providerName: string;
  tariffName: string;
  importCost: number;
  exportRevenue: number;
  netCost: number;
  isCurrent: boolean;
  isProspect: boolean;
  isBest: boolean;
  savings: number;
  maxSavings: number;
  oneTimeAdjustment: number;
  // Editable switching costs
  exitFee: number;
  switchingBonus: number;
  onCostSaved: () => void;
  onSwitch?: () => void;
  onEdit?: () => void;
}

export function ProviderCard({
  tariffId,
  providerName,
  tariffName,
  importCost,
  exportRevenue,
  netCost,
  isCurrent,
  isProspect,
  isBest,
  savings,
  maxSavings,
  oneTimeAdjustment,
  exitFee,
  switchingBonus,
  onCostSaved,
  onSwitch,
  onEdit,
}: ProviderCardProps) {
  const [localExitFee, setLocalExitFee] = useState(String(exitFee || ""));
  const [localBonus, setLocalBonus] = useState(String(switchingBonus || ""));
  const [switching, setSwitching] = useState(false);

  const hasAdjustment = !isCurrent && oneTimeAdjustment !== 0;
  const year1Total = hasAdjustment ? netCost - oneTimeAdjustment : netCost;
  const year1Savings = hasAdjustment ? savings + oneTimeAdjustment : savings;
  const showBestBadge = isBest && !isCurrent;

  async function saveExitFee() {
    const val = parseFloat(localExitFee) || 0;
    await fetch(`/api/tariffs/${tariffId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exitFee: val }),
    });
    onCostSaved();
  }

  async function saveBonus() {
    const val = parseFloat(localBonus) || 0;
    await fetch(`/api/prospects/${tariffId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ switchingBonus: val }),
    });
    onCostSaved();
  }

  async function handleSwitch() {
    if (!onSwitch) return;
    setSwitching(true);
    try {
      await onSwitch();
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div
      className={`relative bg-[#1E293B] rounded-2xl p-4 ${
        isCurrent
          ? "border-2 border-[#3B82F6]"
          : isBest
            ? "border-2 border-[#10B981]"
            : ""
      } ${showBestBadge ? "mt-2" : ""}`}
    >
      {showBestBadge && (
        <div className="-top-3 left-4 absolute px-3 py-1 bg-[#10B981] text-[#0F172A] text-xs font-semibold rounded-full">
          Best Savings
        </div>
      )}

      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{providerName}</h3>
          <p className="text-sm text-[#94A3B8] mb-3">{tariffName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isCurrent && (
            <div className="px-2 py-0.5 bg-[#3B82F6]/20 text-[#3B82F6] text-xs rounded-full">
              Current
            </div>
          )}
          {isProspect && (
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 bg-[#F59E0B]/20 text-[#F59E0B] text-xs rounded-full">
                Prospect
              </div>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="text-[#94A3B8] hover:text-white transition-colors"
                  aria-label="Edit prospect"
                  title="Edit"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-[#0F172A] rounded-lg p-3">
          <div className="text-xs text-[#94A3B8]">Annual Cost</div>
          <div className="text-xl font-bold text-[#EF4444]">
            €{importCost.toFixed(0)}
          </div>
        </div>
        <div className="bg-[#0F172A] rounded-lg p-3">
          <div className="text-xs text-[#94A3B8]">Export Revenue</div>
          <div className="text-xl font-bold text-[#10B981]">
            €{exportRevenue.toFixed(0)}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-3 space-y-2">
        <div className="flex justify-between items-center">
          <div className="text-[#94A3B8]">Net Annual</div>
          <div className={`text-xl font-bold ${hasAdjustment ? "text-[#94A3B8] text-base" : ""}`}>
            €{netCost.toFixed(0)}
          </div>
        </div>

        {/* Editable exit fee (current tariff) */}
        {isCurrent && (
          <div className="flex justify-between items-center text-sm">
            <div className="text-[#94A3B8]">Exit fee</div>
            <div className="flex items-center bg-[#0F172A] rounded px-2 py-1 gap-1 w-24">
              <span className="text-[#EF4444] text-xs">€</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={localExitFee}
                onChange={(e) => setLocalExitFee(e.target.value)}
                onBlur={saveExitFee}
                className="bg-transparent text-xs text-white w-full outline-none placeholder:text-slate-600 text-right"
              />
            </div>
          </div>
        )}

        {/* Editable switching bonus (prospect tariff) */}
        {isProspect && (
          <div className="flex justify-between items-center text-sm">
            <div className="text-[#94A3B8]">Switching bonus</div>
            <div className="flex items-center bg-[#0F172A] rounded px-2 py-1 gap-1 w-24">
              <span className="text-[#10B981] text-xs">€</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={localBonus}
                onChange={(e) => setLocalBonus(e.target.value)}
                onBlur={saveBonus}
                className="bg-transparent text-xs text-white w-full outline-none placeholder:text-slate-600 text-right"
              />
            </div>
          </div>
        )}

        {hasAdjustment && (
          <div className="flex justify-between items-center text-sm">
            <div className="text-[#94A3B8]">One-time adj.</div>
            <div className={oneTimeAdjustment > 0 ? "text-[#10B981]" : "text-[#EF4444]"}>
              {oneTimeAdjustment > 0 ? "−" : "+"}€{Math.abs(oneTimeAdjustment).toFixed(0)}
            </div>
          </div>
        )}

        {hasAdjustment && (
          <div className="flex justify-between items-center border-t border-slate-700 pt-2">
            <div className="text-[#94A3B8]">Year 1 Total</div>
            <div className="text-xl font-bold">€{year1Total.toFixed(0)}</div>
          </div>
        )}

        {(savings !== 0 || !isCurrent) && (
          <>
            <SavingsBar savings={year1Savings} maxSavings={maxSavings} />
            {isCurrent && (
              <div className="text-xs text-[#94A3B8] mt-1">Your baseline</div>
            )}
          </>
        )}

        {/* Switch to this provider button */}
        {isProspect && onSwitch && (
          <button
            onClick={handleSwitch}
            disabled={switching}
            className="w-full mt-2 py-2 bg-[#10B981]/20 text-[#10B981] rounded-lg text-sm font-medium hover:bg-[#10B981]/30 transition-colors disabled:opacity-50"
          >
            {switching ? "Switching..." : "Switch to this provider"}
          </button>
        )}
      </div>
    </div>
  );
}
