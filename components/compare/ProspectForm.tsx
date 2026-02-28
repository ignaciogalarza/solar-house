"use client";

import { useState } from "react";

interface Period {
  name: string;
  rate: string;   // stored as cents string in the UI (e.g. "19.5")
  startTime: string;
  endTime: string;
}

interface InitialValues {
  providerName: string;
  tariffName: string;
  exportRate: number | null;      // euros in DB
  standingCharge: number | null;  // euros in DB
  switchingBonus: number | null;  // euros flat amount
  periods: Array<{
    name: string;
    rate: number;   // euros in DB
    startTime: string;
    endTime: string;
  }>;
}

interface ProspectFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  // Edit mode — when provided the form PATCHes instead of POSTing
  editProspectId?: number;
  initialValues?: InitialValues;
}

const DEFAULT_PERIODS: Period[] = [
  { name: "Day", rate: "", startTime: "08:00", endTime: "23:00" },
  { name: "Night", rate: "", startTime: "23:00", endTime: "08:00" },
];

/** Convert a cents string entered by the user to a euro number for the API */
function centsToEuros(centsStr: string): number {
  return parseFloat(centsStr) / 100;
}

/** Convert a euro value from the DB to a cents string for display */
function eurosToCentsStr(euros: number | null | undefined): string {
  if (euros == null) return "";
  return (euros * 100).toFixed(2).replace(/\.?0+$/, "");
}

export function ProspectForm({
  onSuccess,
  onCancel,
  editProspectId,
  initialValues,
}: ProspectFormProps) {
  const isEditMode = editProspectId !== undefined;

  const [providerName, setProviderName] = useState(initialValues?.providerName ?? "");
  const [tariffName, setTariffName] = useState(initialValues?.tariffName ?? "");
  const [exportRate, setExportRate] = useState(
    eurosToCentsStr(initialValues?.exportRate)
  );
  const [standingCharge, setStandingCharge] = useState(
    eurosToCentsStr(initialValues?.standingCharge)
  );
  const [switchingBonus, setSwitchingBonus] = useState(
    initialValues?.switchingBonus != null ? String(initialValues.switchingBonus) : ""
  );
  const [periods, setPeriods] = useState<Period[]>(
    initialValues?.periods?.length
      ? initialValues.periods.map((p) => ({
          name: p.name,
          rate: eurosToCentsStr(p.rate),
          startTime: p.startTime,
          endTime: p.endTime,
        }))
      : DEFAULT_PERIODS
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updatePeriod(index: number, field: keyof Period, value: string) {
    setPeriods((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }

  function addPeriod() {
    setPeriods((prev) => [
      ...prev,
      { name: "", rate: "", startTime: "00:00", endTime: "00:00" },
    ]);
  }

  function removePeriod(index: number) {
    setPeriods((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validPeriods = periods.filter(
      (p) => p.name && p.rate && p.startTime && p.endTime
    );
    if (validPeriods.length === 0) {
      setError("At least one complete rate period is required.");
      return;
    }

    const payload = {
      providerName,
      tariffName,
      exportRate: exportRate ? centsToEuros(exportRate) : undefined,
      standingCharge: standingCharge ? centsToEuros(standingCharge) : undefined,
      switchingBonus: switchingBonus ? parseFloat(switchingBonus) : undefined,
      periods: validPeriods.map((p) => ({
        name: p.name,
        rate: centsToEuros(p.rate),
        startTime: p.startTime,
        endTime: p.endTime,
      })),
    };

    setSaving(true);
    try {
      const res = isEditMode
        ? await fetch(`/api/prospects/${editProspectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/prospects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || (isEditMode ? "Failed to update provider" : "Failed to add provider"));
        return;
      }

      onSuccess();
    } catch {
      setError(isEditMode ? "Failed to update provider" : "Failed to add provider");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[#1E293B] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-white">
          {isEditMode ? "Edit Provider" : "Add Provider to Compare"}
        </div>
        <button
          onClick={onCancel}
          className="text-[#94A3B8] hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Provider / Tariff name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1">Provider</label>
            <input
              type="text"
              required
              placeholder="e.g. Electric Ireland"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              className="w-full bg-[#0F172A] text-sm text-white rounded-lg px-3 py-2 outline-none placeholder:text-slate-600 border border-transparent focus:border-[#F59E0B]"
            />
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1">Tariff name</label>
            <input
              type="text"
              required
              placeholder="e.g. Home Plan"
              value={tariffName}
              onChange={(e) => setTariffName(e.target.value)}
              className="w-full bg-[#0F172A] text-sm text-white rounded-lg px-3 py-2 outline-none placeholder:text-slate-600 border border-transparent focus:border-[#F59E0B]"
            />
          </div>
        </div>

        {/* Rates section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-[#94A3B8]">Rate periods (c/kWh)</label>
            <button
              type="button"
              onClick={addPeriod}
              className="text-xs text-[#F59E0B] hover:text-[#FCD34D]"
            >
              + Add period
            </button>
          </div>
          <div className="space-y-2">
            {periods.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center">
                <input
                  type="text"
                  placeholder="Name"
                  value={p.name}
                  onChange={(e) => updatePeriod(i, "name", e.target.value)}
                  className="bg-[#0F172A] text-xs text-white rounded px-2 py-1.5 outline-none placeholder:text-slate-600 min-w-0"
                />
                <div className="flex items-center bg-[#0F172A] rounded px-2 py-1.5 gap-1">
                  <span className="text-[#94A3B8] text-xs">c</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={p.rate}
                    onChange={(e) => updatePeriod(i, "rate", e.target.value)}
                    className="bg-transparent text-xs text-white w-full outline-none placeholder:text-slate-600 min-w-0"
                  />
                </div>
                <input
                  type="time"
                  value={p.startTime}
                  onChange={(e) => updatePeriod(i, "startTime", e.target.value)}
                  className="bg-[#0F172A] text-xs text-white rounded px-2 py-1.5 outline-none min-w-0"
                />
                <input
                  type="time"
                  value={p.endTime}
                  onChange={(e) => updatePeriod(i, "endTime", e.target.value)}
                  className="bg-[#0F172A] text-xs text-white rounded px-2 py-1.5 outline-none min-w-0"
                />
                {periods.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePeriod(i)}
                    className="text-[#EF4444] hover:text-red-400 flex-shrink-0"
                    aria-label="Remove period"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Standing charge + Export rate + Switching bonus */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1">Standing (c/day)</label>
            <div className="flex items-center bg-[#0F172A] rounded-lg px-2 py-2 gap-1">
              <span className="text-[#94A3B8] text-xs">c</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={standingCharge}
                onChange={(e) => setStandingCharge(e.target.value)}
                className="bg-transparent text-xs text-white w-full outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1">Export (c/kWh)</label>
            <div className="flex items-center bg-[#0F172A] rounded-lg px-2 py-2 gap-1">
              <span className="text-[#94A3B8] text-xs">c</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={exportRate}
                onChange={(e) => setExportRate(e.target.value)}
                className="bg-transparent text-xs text-white w-full outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1">Switch bonus</label>
            <div className="flex items-center bg-[#0F172A] rounded-lg px-2 py-2 gap-1">
              <span className="text-[#10B981] text-xs">€</span>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={switchingBonus}
                onChange={(e) => setSwitchingBonus(e.target.value)}
                className="bg-transparent text-xs text-white w-full outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="text-xs text-[#EF4444]">{error}</div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-slate-600 text-[#94A3B8] text-sm hover:border-slate-400 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-[#F59E0B] text-[#0F172A] text-sm font-medium disabled:opacity-50 hover:bg-[#FCD34D] transition-colors"
          >
            {saving
              ? isEditMode ? "Saving..." : "Adding..."
              : isEditMode ? "Save Changes" : "Add Provider"}
          </button>
        </div>
      </form>
    </div>
  );
}
