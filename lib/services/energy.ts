/**
 * Energy Data Sync Service
 *
 * Fetches energy data from MyEnergi API and stores it in the SQLite database.
 * Handles both real-time status and historical data sync.
 */

import { db } from "@/lib/db";
import { energyReadings } from "@/lib/db/schema";
import { createMyEnergiClient, type DayHourResponse } from "@/lib/myenergi";
import { eq, and, gte, lte, desc } from "drizzle-orm";

// =============================================================================
// Types
// =============================================================================

export interface EnergyReading {
  timestamp: string;
  solarGenerationWh: number | null;
  gridImportWh: number | null;
  gridExportWh: number | null;
  evChargeKwh: number | null;
  hotWaterDivertedWh: number | null;
  hotWaterBoostWh: number | null;
}

export interface CurrentStatus {
  solarGenerationW: number;
  gridW: number; // positive = import, negative = export
  consumptionW: number;
  evChargingW: number;
  hotWaterDiversionW: number;
  zappiStatus: string;
  eddiStatus: string;
  timestamp: Date;
}

export interface SyncResult {
  success: boolean;
  recordsInserted: number;
  recordsSkipped: number;
  errors: string[];
}

export interface DailyTotals {
  generatedKwh: number;
  consumedKwh: number;
  exportedKwh: number;
  importedKwh: number;
  evChargedKwh: number;
  hotWaterKwh: number;
}

// =============================================================================
// Energy Service
// =============================================================================

// Cache for daily totals (2 minute TTL for fresher data)
let dailyTotalsCache: { data: DailyTotals; timestamp: number } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export class EnergyService {
  private client = createMyEnergiClient();

  /**
   * Get current real-time status from all devices
   */
  async getCurrentStatus(): Promise<CurrentStatus> {
    const [zappis, eddis] = await Promise.all([
      this.client.getStatusZappiAll(),
      this.client.getStatusEddiAll(),
    ]);

    const zappi = zappis[0];
    const eddi = eddis[0];

    // Calculate consumption: generation + import - export
    const solarGenerationW = zappi?.gen || eddi?.gen || 0;
    const gridW = zappi?.grd || eddi?.grd || 0;
    const evChargingW = zappi?.div || 0;
    const hotWaterDiversionW = eddi?.div || 0;

    // Consumption = what we're using = generation + grid import - grid export
    // If gridW is negative, we're exporting
    const consumptionW = solarGenerationW + Math.max(0, gridW) + evChargingW + hotWaterDiversionW;

    return {
      solarGenerationW,
      gridW,
      consumptionW,
      evChargingW,
      hotWaterDiversionW,
      zappiStatus: this.getZappiStatusText(zappi?.pst || "A", zappi?.sta || 0),
      eddiStatus: this.getEddiStatusText(eddi?.sta || 0),
      timestamp: new Date(),
    };
  }

  /**
   * Get daily totals for a specific date (defaults to today)
   * Fetches directly from MyEnergi API with caching
   */
  async getDailyTotals(date: Date = new Date()): Promise<DailyTotals> {
    // Check cache first (only for today's date)
    const isToday = date.toDateString() === new Date().toDateString();
    if (isToday && dailyTotalsCache && Date.now() - dailyTotalsCache.timestamp < CACHE_TTL_MS) {
      return dailyTotalsCache.data;
    }

    // Get device serials
    const [zappis, eddis] = await Promise.all([
      this.client.getStatusZappiAll(),
      this.client.getStatusEddiAll(),
    ]);

    // Serial numbers may come as numbers, convert to strings
    const zappiSerial = zappis[0]?.sno?.toString();
    const eddiSerial = eddis[0]?.sno?.toString();

    // Fetch hourly data from both devices
    const [zappiData, eddiData] = await Promise.all([
      zappiSerial
        ? this.client.getDayHour("Z", zappiSerial, date)
        : Promise.resolve(null),
      eddiSerial
        ? this.client.getDayHour("E", eddiSerial, date)
        : Promise.resolve(null),
    ]);

    // Aggregate totals
    let generatedWh = 0;
    let importedWh = 0;
    let exportedWh = 0;
    let evChargedWh = 0;
    let hotWaterWh = 0;

    // Helper to extract hour array from response (format: { U<serial>: [...] } or { Z<serial>: [...] })
    // MyEnergi API fields: gen=generation, gep=grid export, imp=grid import, h1d=heater1 diverted, h1b=heater1 boost
    const getHourArray = (data: unknown): Array<{ gen?: number; gep?: number; imp?: number; h1d?: number; h1b?: number; div?: number }> => {
      if (!data || typeof data !== 'object') return [];
      const keys = Object.keys(data);
      const dataKey = keys.find(k => k.startsWith('U') || k.startsWith('Z'));
      if (dataKey && Array.isArray((data as Record<string, unknown>)[dataKey])) {
        return (data as Record<string, unknown>)[dataKey] as Array<{ gen?: number; gep?: number; imp?: number; h1d?: number; h1b?: number; div?: number }>;
      }
      return [];
    };

    // Process Zappi data (has generation, import, EV charging)
    // MyEnergi fields: gep = Green Energy Production (solar), imp = import, exp = export
    const zappiHours = getHourArray(zappiData);
    for (const hour of zappiHours) {
      generatedWh += hour.gep || 0; // gep = Green Energy Production (solar generation)
      importedWh += hour.imp || 0;  // imp = Grid import
      exportedWh += hour.exp || 0;  // exp = Grid export (if exists)
      evChargedWh += hour.div || hour.h1d || 0; // Diverted to EV
    }

    // Process Eddi data (has hot water diversion)
    const eddiHours = getHourArray(eddiData);
    for (const hour of eddiHours) {
      hotWaterWh += hour.h1d || 0; // Diverted to heater 1
      hotWaterWh += hour.h1b || 0; // Boost to heater 1
      // If no Zappi data, get generation from Eddi
      if (zappiHours.length === 0) {
        generatedWh += hour.gep || 0; // gep = Green Energy Production (solar)
        importedWh += hour.imp || 0;  // imp = Grid import
        exportedWh += hour.exp || 0;  // exp = Grid export (if exists)
      }
    }

    // Values from MyEnergi are in Joules, convert to kWh (J / 3600 = Wh, / 1000 = kWh)
    const joulesToKwh = (j: number) => j / 3600 / 1000;
    const generatedKwh = joulesToKwh(generatedWh);
    const importedKwh = joulesToKwh(importedWh);
    const exportedKwh = joulesToKwh(exportedWh);
    const evChargedKwh = joulesToKwh(evChargedWh);
    const hotWaterKwh = joulesToKwh(hotWaterWh);

    // Consumption = generation + import - export
    const consumedKwh = generatedKwh + importedKwh - exportedKwh;

    const result: DailyTotals = {
      generatedKwh: Math.round(generatedKwh * 10) / 10,
      consumedKwh: Math.round(consumedKwh * 10) / 10,
      exportedKwh: Math.round(exportedKwh * 10) / 10,
      importedKwh: Math.round(importedKwh * 10) / 10,
      evChargedKwh: Math.round(evChargedKwh * 10) / 10,
      hotWaterKwh: Math.round(hotWaterKwh * 10) / 10,
    };

    // Cache the result if we got valid data
    if (isToday && (result.importedKwh > 0 || result.generatedKwh > 0)) {
      dailyTotalsCache = { data: result, timestamp: Date.now() };
    }

    // If we got no data but have cache, return cached data
    if (result.importedKwh === 0 && result.generatedKwh === 0 && dailyTotalsCache) {
      return dailyTotalsCache.data;
    }

    return result;
  }

  /**
   * Sync historical data for a specific date
   */
  async syncDayData(date: Date): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsInserted: 0,
      recordsSkipped: 0,
      errors: [],
    };

    try {
      // Get Zappi serial (first device)
      const zappis = await this.client.getStatusZappiAll();
      const zappiSerial = zappis[0]?.sno;

      // Get Eddi serial (first device)
      const eddis = await this.client.getStatusEddiAll();
      const eddiSerial = eddis[0]?.sno;

      // Fetch hourly data from both devices
      const [zappiData, eddiData] = await Promise.all([
        zappiSerial
          ? this.client.getDayHour("Z", zappiSerial, date)
          : Promise.resolve(null),
        eddiSerial
          ? this.client.getDayHour("E", eddiSerial, date)
          : Promise.resolve(null),
      ]);

      // Process and store the data
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      // Combine data from both sources
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(year, month - 1, day, hour).toISOString();

        const zappiHour = this.findHourData(zappiData, hour);
        const eddiHour = this.findHourData(eddiData, hour);

        // Skip if no data for this hour
        if (!zappiHour && !eddiHour) {
          result.recordsSkipped++;
          continue;
        }

        const reading: EnergyReading = {
          timestamp,
          solarGenerationWh: zappiHour?.gep ?? eddiHour?.gep ?? null,
          gridImportWh: zappiHour?.imp ?? eddiHour?.imp ?? null,
          gridExportWh: zappiHour?.exp ?? eddiHour?.exp ?? null,
          evChargeKwh: null, // Calculated separately
          hotWaterDivertedWh: eddiHour?.h1d ?? null,
          hotWaterBoostWh: eddiHour?.h1b ?? null,
        };

        try {
          await this.upsertReading(reading);
          result.recordsInserted++;
        } catch (err) {
          result.recordsSkipped++;
          result.errors.push(`Hour ${hour}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }
    } catch (err) {
      result.success = false;
      result.errors.push(err instanceof Error ? err.message : "Unknown error");
    }

    return result;
  }

  /**
   * Sync data for a date range
   */
  async syncDateRange(startDate: Date, endDate: Date): Promise<SyncResult> {
    const totalResult: SyncResult = {
      success: true,
      recordsInserted: 0,
      recordsSkipped: 0,
      errors: [],
    };

    const current = new Date(startDate);
    while (current <= endDate) {
      const dayResult = await this.syncDayData(new Date(current));

      totalResult.recordsInserted += dayResult.recordsInserted;
      totalResult.recordsSkipped += dayResult.recordsSkipped;
      totalResult.errors.push(...dayResult.errors);

      if (!dayResult.success) {
        totalResult.success = false;
      }

      current.setDate(current.getDate() + 1);
    }

    return totalResult;
  }

  /**
   * Get readings from the database for a date range
   */
  async getReadings(startDate: Date, endDate: Date): Promise<EnergyReading[]> {
    const readings = await db
      .select()
      .from(energyReadings)
      .where(
        and(
          gte(energyReadings.timestamp, startDate.toISOString()),
          lte(energyReadings.timestamp, endDate.toISOString())
        )
      )
      .orderBy(energyReadings.timestamp);

    return readings.map((r) => ({
      timestamp: r.timestamp,
      solarGenerationWh: r.solarGenerationWh,
      gridImportWh: r.gridImportWh,
      gridExportWh: r.gridExportWh,
      evChargeKwh: r.evChargeKwh,
      hotWaterDivertedWh: r.hotWaterDivertedWh,
      hotWaterBoostWh: r.hotWaterBoostWh,
    }));
  }

  /**
   * Get the most recent reading
   */
  async getLatestReading(): Promise<EnergyReading | null> {
    const [reading] = await db
      .select()
      .from(energyReadings)
      .orderBy(desc(energyReadings.timestamp))
      .limit(1);

    if (!reading) return null;

    return {
      timestamp: reading.timestamp,
      solarGenerationWh: reading.solarGenerationWh,
      gridImportWh: reading.gridImportWh,
      gridExportWh: reading.gridExportWh,
      evChargeKwh: reading.evChargeKwh,
      hotWaterDivertedWh: reading.hotWaterDivertedWh,
      hotWaterBoostWh: reading.hotWaterBoostWh,
    };
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Insert or update a reading
   */
  private async upsertReading(reading: EnergyReading): Promise<void> {
    // Check if reading exists
    const existing = await db
      .select()
      .from(energyReadings)
      .where(eq(energyReadings.timestamp, reading.timestamp))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(energyReadings)
        .set({
          solarGenerationWh: reading.solarGenerationWh,
          gridImportWh: reading.gridImportWh,
          gridExportWh: reading.gridExportWh,
          evChargeKwh: reading.evChargeKwh,
          hotWaterDivertedWh: reading.hotWaterDivertedWh,
          hotWaterBoostWh: reading.hotWaterBoostWh,
        })
        .where(eq(energyReadings.timestamp, reading.timestamp));
    } else {
      // Insert new
      await db.insert(energyReadings).values({
        timestamp: reading.timestamp,
        solarGenerationWh: reading.solarGenerationWh,
        gridImportWh: reading.gridImportWh,
        gridExportWh: reading.gridExportWh,
        evChargeKwh: reading.evChargeKwh,
        hotWaterDivertedWh: reading.hotWaterDivertedWh,
        hotWaterBoostWh: reading.hotWaterBoostWh,
      });
    }
  }

  /**
   * Find hour data from day response
   */
  private findHourData(
    data: DayHourResponse | null,
    hour: number
  ): { gep?: number; imp?: number; exp?: number; h1d?: number; h1b?: number } | null {
    if (!data?.data) return null;
    return data.data.find((d) => d.hr === hour) || null;
  }

  /**
   * Get human-readable Zappi status
   */
  private getZappiStatusText(pst: string, sta: number): string {
    // Pilot state
    const pilotStates: Record<string, string> = {
      A: "Disconnected",
      B1: "Connected",
      B2: "Waiting for EV",
      C1: "Ready to charge",
      C2: "Charging",
      F: "Fault",
    };

    // Status codes
    const statusCodes: Record<number, string> = {
      0: "Starting",
      1: "Waiting for export",
      2: "DSR",
      3: "Diverting",
      4: "Boosting",
      5: "Complete",
      6: "Stopped",
    };

    const pilotText = pilotStates[pst] || "Unknown";
    const statusText = statusCodes[sta] || "Unknown";

    if (pst === "C2") {
      return sta === 4 ? "Boost Charging" : "Charging";
    }
    if (pst === "A") {
      return "Not Connected";
    }
    return `${pilotText} - ${statusText}`;
  }

  /**
   * Get human-readable Eddi status
   */
  private getEddiStatusText(sta: number): string {
    const statusCodes: Record<number, string> = {
      0: "Starting",
      1: "Waiting for surplus",
      2: "DSR",
      3: "Diverting",
      4: "Boosting",
      5: "Max temp reached",
      6: "Stopped",
    };

    return statusCodes[sta] || "Unknown";
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

let energyService: EnergyService | null = null;

export function getEnergyService(): EnergyService {
  if (!energyService) {
    energyService = new EnergyService();
  }
  return energyService;
}
