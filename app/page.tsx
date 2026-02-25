"use client";

import { useEffect, useState } from "react";
import {
  PowerGauge,
  EnergyFlow,
  DeviceCard,
  TodaySummary,
} from "@/components/dashboard";

interface EnergyData {
  solarW: number;
  gridW: number;
  consumptionW: number;
  evChargingW: number;
  hotWaterW: number;
  zappiStatus: string;
  eddiStatus: string;
  eddiTempC?: number;
  timestamp: string;
}

interface DailyTotals {
  generatedKwh: number;
  consumedKwh: number;
  exportedKwh: number;
  importedKwh: number;
  evChargedKwh: number;
  hotWaterKwh: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<EnergyData | null>(null);
  const [dailyTotals, setDailyTotals] = useState<DailyTotals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [currentRes, todayRes] = await Promise.all([
          fetch("/api/energy/current"),
          fetch("/api/energy/today"),
        ]);

        const currentJson = await currentRes.json();
        const todayJson = await todayRes.json();

        if (currentJson.success) {
          setData(currentJson.data);
        }
        if (todayJson.success) {
          setDailyTotals(todayJson.data);
        }
      } catch (error) {
        console.error("Failed to fetch energy data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-4 space-y-4">
        <div className="bg-surface rounded-2xl p-8 animate-pulse">
          <div className="h-40 bg-slate-700 rounded-lg"></div>
        </div>
        <div className="bg-surface rounded-2xl p-8 animate-pulse">
          <div className="h-48 bg-slate-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 py-4">
        <div className="bg-surface rounded-2xl p-8 text-center">
          <p className="text-text-secondary">Failed to load energy data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Power Gauge */}
      <PowerGauge
        gridW={data.gridW}
        solarW={data.solarW}
        consumptionW={data.consumptionW}
        generatedKwh={dailyTotals?.generatedKwh ?? 0}
        consumedKwh={dailyTotals?.consumedKwh ?? 0}
        exportedKwh={dailyTotals?.exportedKwh ?? 0}
        importedKwh={dailyTotals?.importedKwh ?? 0}
      />

      {/* Energy Flow Diagram */}
      <EnergyFlow
        solarW={data.solarW}
        gridW={data.gridW}
        consumptionW={data.consumptionW}
        evChargingW={data.evChargingW}
        hotWaterW={data.hotWaterW}
        eddiTempC={data.eddiTempC}
      />

      {/* Device Status Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-text-secondary">Devices</h2>

        <DeviceCard
          name="Zappi"
          type="EV Charger"
          status={data.zappiStatus.split(" - ")[0] || "Eco+"}
          detail={data.zappiStatus.split(" - ")[1] || ""}
          variant="zappi"
        />

        <DeviceCard
          name="Eddi"
          type="Hot Water"
          status={data.eddiTempC ? `${data.eddiTempC}°C` : "—"}
          detail={
            data.hotWaterW > 50
              ? `Diverting ${(data.hotWaterW / 1000).toFixed(1)}kW`
              : data.eddiStatus
          }
          variant="eddi"
        />

        <DeviceCard
          name="Harvi"
          type="CT Monitor"
          status="Online"
          detail="3 CTs active"
          variant="harvi"
        />
      </div>

      {/* Today's Summary */}
      {dailyTotals && (
        <TodaySummary
          generatedKwh={dailyTotals.generatedKwh}
          consumedKwh={dailyTotals.consumedKwh}
          exportedKwh={dailyTotals.exportedKwh}
          importedKwh={dailyTotals.importedKwh}
          exportRate={0.21}
          importRate={0.43}
        />
      )}
    </div>
  );
}
