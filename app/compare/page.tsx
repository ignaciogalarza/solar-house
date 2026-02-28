"use client";

import { useState, useEffect, useCallback } from "react";
import { UsageSummary } from "@/components/compare/UsageSummary";
import { ProviderCard } from "@/components/compare/ProviderCard";
import { RateTable } from "@/components/compare/RateTable";
import { ProspectForm } from "@/components/compare/ProspectForm";

type Period = "week" | "month" | "year";

interface Comparison {
  tariffId: number;
  providerName: string;
  tariffName: string;
  importCost: number;
  exportRevenue: number;
  standingCharges: number;
  psoCharges: number;
  netCost: number;
  isCurrent: boolean;
  isProspect: boolean;
  isBest: boolean;
  savings: number;
  switchingBonus: number;
  periods: { name: string | null; rate: number | null }[];
}

interface CompareData {
  startDate: string;
  endDate: string;
  exitFee: number;
  usage: {
    totalImportKwh: number;
    totalExportKwh: number;
    totalGenerationKwh: number;
    days: number;
  };
  comparisons: Comparison[];
}

function getDateRange(period: Period): { startDate: string; endDate: string } {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const endDate = yesterday.toISOString().split("T")[0];

  const daysMap: Record<Period, number> = { week: 7, month: 30, year: 365 };
  const start = new Date(yesterday);
  start.setDate(start.getDate() - daysMap[period] + 1);
  const startDate = start.toISOString().split("T")[0];

  return { startDate, endDate };
}

export default function ComparePage() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProspectForm, setShowProspectForm] = useState(false);
  const [editingProspect, setEditingProspect] = useState<{
    id: number;
    providerName: string;
    tariffName: string;
    exportRate: number | null;
    standingCharge: number | null;
    switchingBonus: number | null;
    periods: Array<{ name: string; rate: number; startTime: string; endTime: string }>;
  } | null>(null);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    const { startDate, endDate } = getDateRange(p);
    try {
      const res = await fetch(
        `/api/compare?startDate=${startDate}&endDate=${endDate}`
      );
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load comparison data");
      }
    } catch {
      setError("Failed to load comparison data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const exitFee = data?.exitFee ?? 0;

  const maxSavings = data
    ? Math.max(
        ...data.comparisons.map((c) => {
          const adj = c.isCurrent ? 0 : c.switchingBonus - exitFee;
          return Math.abs(c.isCurrent ? c.savings : c.savings + adj);
        }),
        1
      )
    : 1;

  const totalExportKwh = data?.usage.totalExportKwh ?? 0;
  const rateTableTariffs = (data?.comparisons ?? []).map((c) => ({
    providerName: c.providerName,
    exportRate: totalExportKwh > 0 ? c.exportRevenue / totalExportKwh : null,
    periods: c.periods
      .filter((p) => p.name && p.rate !== null)
      .map((p) => ({ name: p.name!, rate: p.rate! })),
    isBest: c.isBest,
  }));

  async function handleEditProspect(tariffId: number) {
    const res = await fetch("/api/prospects");
    if (!res.ok) return;
    const prospects: Array<{
      id: number;
      providerName: string;
      tariffName: string;
      exportRate: number | null;
      standingCharge: number | null;
      switchingBonus: number | null;
      periods: Array<{ name: string; rate: number; startTime: string; endTime: string }>;
    }> = await res.json();
    const prospect = prospects.find((p) => p.id === tariffId);
    if (!prospect) return;
    setShowProspectForm(false);
    setEditingProspect(prospect);
  }

  async function handleSwitch(tariffId: number) {
    // Fetch full prospect data (with periods)
    const res = await fetch("/api/prospects");
    if (!res.ok) return;
    const prospects: Array<{
      id: number;
      providerName: string;
      tariffName: string;
      tariffType: string;
      exportRate: number | null;
      standingCharge: number | null;
      periods: Array<{
        name: string;
        rate: number;
        startTime: string;
        endTime: string;
        daysOfWeek: number[] | null;
      }>;
    }> = await res.json();

    const prospect = prospects.find((p) => p.id === tariffId);
    if (!prospect) return;

    // Create as the new current tariff
    await fetch("/api/tariffs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerName: prospect.providerName,
        tariffName: prospect.tariffName,
        tariffType: prospect.tariffType || "day_night",
        isCurrent: true,
        exportRate: prospect.exportRate ?? 0,
        standingCharge: prospect.standingCharge ?? 0,
        validFrom: new Date().toISOString().split("T")[0],
        periods: prospect.periods.map((p) => ({
          name: p.name,
          rate: p.rate,
          startTime: p.startTime,
          endTime: p.endTime,
          daysOfWeek: p.daysOfWeek,
        })),
      }),
    });

    // Delete the prospect
    await fetch(`/api/prospects/${tariffId}`, { method: "DELETE" });

    // Refetch
    fetchData(period);
  }

  return (
    <main className="px-4 py-4 space-y-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Compare Providers</h1>
      </div>

      {/* Period Selector */}
      <div className="bg-[#1E293B] rounded-xl p-1 flex gap-1">
        {(["week", "month", "year"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={
              period === p
                ? "flex-1 py-2 rounded-lg bg-[#F59E0B] text-[#0F172A] text-sm font-medium capitalize"
                : "flex-1 py-2 rounded-lg text-[#94A3B8] text-sm capitalize"
            }
          >
            {p}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-[#94A3B8]">
          Calculating...
        </div>
      )}

      {error && !loading && (
        <div className="bg-[#1E293B] rounded-2xl p-4 text-center text-[#EF4444]">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <UsageSummary
            importKwh={data.usage.totalImportKwh}
            exportKwh={data.usage.totalExportKwh}
            generationKwh={data.usage.totalGenerationKwh}
          />

          {data.comparisons.length === 0 ? (
            <div className="bg-[#1E293B] rounded-2xl p-6 text-center space-y-3">
              <p className="text-[#94A3B8]">No tariffs to compare.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.comparisons.map((c) => {
                const adj = c.isCurrent ? 0 : c.switchingBonus - exitFee;
                return (
                  <ProviderCard
                    key={c.tariffId}
                    tariffId={c.tariffId}
                    providerName={c.providerName}
                    tariffName={c.tariffName}
                    importCost={c.importCost + c.standingCharges + c.psoCharges}
                    exportRevenue={c.exportRevenue}
                    netCost={c.netCost}
                    isCurrent={c.isCurrent}
                    isProspect={c.isProspect}
                    isBest={c.isBest}
                    savings={c.savings}
                    maxSavings={maxSavings}
                    oneTimeAdjustment={adj}
                    exitFee={exitFee}
                    switchingBonus={c.switchingBonus}
                    onCostSaved={() => fetchData(period)}
                    onSwitch={c.isProspect ? () => handleSwitch(c.tariffId) : undefined}
                    onEdit={c.isProspect ? () => handleEditProspect(c.tariffId) : undefined}
                  />
                );
              })}
            </div>
          )}

          {/* Rate Comparison Table */}
          {rateTableTariffs.length > 0 && (
            <RateTable tariffs={rateTableTariffs} />
          )}

          {/* Edit Prospect Form */}
          {editingProspect && (
            <ProspectForm
              editProspectId={editingProspect.id}
              initialValues={editingProspect}
              onSuccess={() => {
                setEditingProspect(null);
                fetchData(period);
              }}
              onCancel={() => setEditingProspect(null)}
            />
          )}

          {/* Add Provider */}
          {!editingProspect && (showProspectForm ? (
            <ProspectForm
              onSuccess={() => {
                setShowProspectForm(false);
                fetchData(period);
              }}
              onCancel={() => setShowProspectForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowProspectForm(true)}
              className="w-full py-4 border-2 border-dashed border-slate-600 rounded-xl text-[#94A3B8] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Provider to Compare
            </button>
          ))}
        </>
      )}
    </main>
  );
}
