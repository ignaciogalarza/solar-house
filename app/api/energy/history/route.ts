/**
 * Historical Energy Data API Route
 *
 * GET /api/energy/history?period=day&date=2026-02-25
 * GET /api/energy/history?period=week
 * GET /api/energy/history?period=month
 * GET /api/energy/history?period=year
 *
 * Returns energy readings from MyEnergi API with database caching for historical data.
 */

import { NextRequest, NextResponse } from "next/server";
import { createMyEnergiClient } from "@/lib/myenergi";
import type { DayHourResponse } from "@/lib/myenergi/types";
import {
  getDailyFromCache,
  storeDailyToCache,
  getMultipleDaysFromCache,
} from "@/lib/services/historyCache";

// =============================================================================
// Types
// =============================================================================

interface HourlyReading {
  hour: number;
  generationKwh: number;
  importKwh: number;
  exportKwh: number;
  consumptionKwh: number;
}

interface DailyReading {
  date: string;
  generationKwh: number;
  importKwh: number;
  exportKwh: number;
  consumptionKwh: number;
}

interface DailyTotals {
  generationKwh: number;
  importKwh: number;
  exportKwh: number;
  consumptionKwh: number;
}

interface DayHistoryResponse {
  success: boolean;
  data?: {
    period: string;
    date: string;
    readings: HourlyReading[];
    totals: DailyTotals;
  };
  error?: string;
}

interface MultiDayHistoryResponse {
  success: boolean;
  data?: {
    period: string;
    startDate: string;
    endDate: string;
    readings: DailyReading[];
    totals: DailyTotals;
  };
  error?: string;
}

type HistoryResponse = DayHistoryResponse | MultiDayHistoryResponse;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert Joules to kWh
 * MyEnergi returns energy values in Joules
 */
function joulesToKwh(joules: number): number {
  return joules / 3600 / 1000;
}

/**
 * Round to 1 decimal place
 */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Extract hour data array from MyEnergi response
 * Format: { U<serial>: [...] } or { Z<serial>: [...] }
 */
function getHourArray(data: DayHourResponse | null): Array<{
  hr?: number;
  gep?: number;
  imp?: number;
  exp?: number;
}> {
  if (!data || typeof data !== "object") return [];

  // Check if data has the expected structure with data array
  if (data.data && Array.isArray(data.data)) {
    return data.data;
  }

  // Fallback: check for device-specific keys
  const keys = Object.keys(data);
  const dataKey = keys.find((k) => k.startsWith("U") || k.startsWith("Z"));
  if (dataKey && Array.isArray((data as Record<string, unknown>)[dataKey])) {
    return (data as Record<string, unknown>)[dataKey] as Array<{
      hr?: number;
      gep?: number;
      imp?: number;
      exp?: number;
    }>;
  }

  return [];
}

/**
 * Validate and parse date parameter
 */
function parseDate(dateStr: string | null): { date: Date; error?: string } {
  if (!dateStr) {
    return { date: new Date(), error: undefined };
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return {
      date: new Date(),
      error: "Invalid date format. Expected YYYY-MM-DD",
    };
  }

  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) {
    return {
      date: new Date(),
      error: "Invalid date value",
    };
  }

  return { date };
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

/**
 * Get date range for multi-day periods
 */
function getDateRange(endDate: string, days: number): string {
  const end = new Date(endDate + "T00:00:00");
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return start.toISOString().split("T")[0];
}

/**
 * Check if a date is today
 */
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Get all dates in a range (inclusive)
 */
function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// =============================================================================
// Data Fetching Functions
// =============================================================================

/**
 * Fetch daily data from MyEnergi API and return totals
 */
async function fetchDailyFromMyEnergi(
  client: ReturnType<typeof createMyEnergiClient>,
  zappiSerial: string | undefined,
  eddiSerial: string | undefined,
  date: Date
): Promise<DailyTotals> {
  // Fetch hourly data from both devices
  const [zappiData, eddiData] = await Promise.all([
    zappiSerial
      ? client.getDayHour("Z", zappiSerial, date)
      : Promise.resolve(null),
    eddiSerial
      ? client.getDayHour("E", eddiSerial, date)
      : Promise.resolve(null),
  ]);

  // Extract hour arrays
  const zappiHours = getHourArray(zappiData);
  const eddiHours = getHourArray(eddiData);

  // Accumulate totals
  let totalGeneration = 0;
  let totalImport = 0;
  let totalExport = 0;

  for (let hour = 0; hour < 24; hour++) {
    const zappiHour = zappiHours.find((h) => h.hr === hour);
    const eddiHour = eddiHours.find((h) => h.hr === hour);

    const generationJ = zappiHour?.gep ?? eddiHour?.gep ?? 0;
    const importJ = zappiHour?.imp ?? eddiHour?.imp ?? 0;
    const exportJ = zappiHour?.exp ?? eddiHour?.exp ?? 0;

    totalGeneration += generationJ;
    totalImport += importJ;
    totalExport += exportJ;
  }

  return {
    generationKwh: round(joulesToKwh(totalGeneration)),
    importKwh: round(joulesToKwh(totalImport)),
    exportKwh: round(joulesToKwh(totalExport)),
    consumptionKwh: round(
      joulesToKwh(totalGeneration + totalImport - totalExport)
    ),
  };
}

/**
 * Fetch hourly data from MyEnergi API
 */
async function fetchHourlyFromMyEnergi(
  client: ReturnType<typeof createMyEnergiClient>,
  zappiSerial: string | undefined,
  eddiSerial: string | undefined,
  date: Date
): Promise<{ readings: HourlyReading[]; totals: DailyTotals }> {
  // Fetch hourly data from both devices
  const [zappiData, eddiData] = await Promise.all([
    zappiSerial
      ? client.getDayHour("Z", zappiSerial, date)
      : Promise.resolve(null),
    eddiSerial
      ? client.getDayHour("E", eddiSerial, date)
      : Promise.resolve(null),
  ]);

  // Extract hour arrays
  const zappiHours = getHourArray(zappiData);
  const eddiHours = getHourArray(eddiData);

  // Build hourly readings
  const readings: HourlyReading[] = [];
  let totalGeneration = 0;
  let totalImport = 0;
  let totalExport = 0;

  for (let hour = 0; hour < 24; hour++) {
    const zappiHour = zappiHours.find((h) => h.hr === hour);
    const eddiHour = eddiHours.find((h) => h.hr === hour);

    const generationJ = zappiHour?.gep ?? eddiHour?.gep ?? 0;
    const importJ = zappiHour?.imp ?? eddiHour?.imp ?? 0;
    const exportJ = zappiHour?.exp ?? eddiHour?.exp ?? 0;

    const generationKwh = joulesToKwh(generationJ);
    const importKwh = joulesToKwh(importJ);
    const exportKwh = joulesToKwh(exportJ);
    const consumptionKwh = generationKwh + importKwh - exportKwh;

    readings.push({
      hour,
      generationKwh: round(generationKwh),
      importKwh: round(importKwh),
      exportKwh: round(exportKwh),
      consumptionKwh: round(consumptionKwh),
    });

    totalGeneration += generationJ;
    totalImport += importJ;
    totalExport += exportJ;
  }

  const totals: DailyTotals = {
    generationKwh: round(joulesToKwh(totalGeneration)),
    importKwh: round(joulesToKwh(totalImport)),
    exportKwh: round(joulesToKwh(totalExport)),
    consumptionKwh: round(
      joulesToKwh(totalGeneration + totalImport - totalExport)
    ),
  };

  return { readings, totals };
}

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * Handle single day request
 */
async function handleDayRequest(
  client: ReturnType<typeof createMyEnergiClient>,
  zappiSerial: string | undefined,
  eddiSerial: string | undefined,
  date: Date
): Promise<DayHistoryResponse> {
  const formattedDate = date.toISOString().split("T")[0];

  // If date is today, always fetch live from MyEnergi
  if (isToday(date)) {
    const { readings, totals } = await fetchHourlyFromMyEnergi(
      client,
      zappiSerial,
      eddiSerial,
      date
    );

    return {
      success: true,
      data: {
        period: "day",
        date: formattedDate,
        readings,
        totals,
      },
    };
  }

  // For past dates, check cache first
  const cached = await getDailyFromCache(formattedDate);

  if (cached) {
    // Cache hit - build hourly readings (not stored in cache for space efficiency)
    const { readings, totals } = await fetchHourlyFromMyEnergi(
      client,
      zappiSerial,
      eddiSerial,
      date
    );

    return {
      success: true,
      data: {
        period: "day",
        date: formattedDate,
        readings,
        totals,
      },
    };
  }

  // Cache miss - fetch from MyEnergi and store
  const { readings, totals } = await fetchHourlyFromMyEnergi(
    client,
    zappiSerial,
    eddiSerial,
    date
  );

  // Store in cache (async, don't wait)
  storeDailyToCache(formattedDate, {
    date: formattedDate,
    generationKwh: totals.generationKwh,
    importKwh: totals.importKwh,
    exportKwh: totals.exportKwh,
    consumptionKwh: totals.consumptionKwh,
  }).catch((err) => {
    console.error("Failed to cache daily data:", err);
  });

  return {
    success: true,
    data: {
      period: "day",
      date: formattedDate,
      readings,
      totals,
    },
  };
}

/**
 * Handle multi-day request (week, month, year)
 */
async function handleMultiDayRequest(
  client: ReturnType<typeof createMyEnergiClient>,
  zappiSerial: string | undefined,
  eddiSerial: string | undefined,
  period: string
): Promise<MultiDayHistoryResponse> {
  // Determine number of days based on period
  const daysMap: Record<string, number> = {
    week: 7,
    month: 30,
    year: 365,
  };

  const days = daysMap[period];
  if (!days) {
    throw new Error("Invalid period: " + period);
  }

  // Get date range (ending yesterday)
  const endDate = getYesterday();
  const startDate = getDateRange(endDate, days);
  const allDates = getDatesInRange(startDate, endDate);

  // Try to get all dates from cache
  const cachedData = await getMultipleDaysFromCache(startDate, endDate);

  // Convert to map for easy lookup
  const cacheMap = new Map<string, DailyReading>();
  for (const item of cachedData) {
    cacheMap.set(item.date, item);
  }

  // Identify missing dates
  const missingDates = allDates.filter((date) => !cacheMap.has(date));

  // Fetch missing dates from MyEnergi
  if (missingDates.length > 0) {
    const fetchPromises = missingDates.map(async (dateStr) => {
      const date = new Date(dateStr + "T00:00:00");
      const totals = await fetchDailyFromMyEnergi(
        client,
        zappiSerial,
        eddiSerial,
        date
      );

      // Store in cache (async, don't wait)
      storeDailyToCache(dateStr, {
        date: dateStr,
        generationKwh: totals.generationKwh,
        importKwh: totals.importKwh,
        exportKwh: totals.exportKwh,
        consumptionKwh: totals.consumptionKwh,
      }).catch((err) => {
        console.error("Failed to cache data for " + dateStr + ":", err);
      });

      return { date: dateStr, ...totals };
    });

    const fetchedData = await Promise.all(fetchPromises);

    // Merge fetched data into cache map
    for (const item of fetchedData) {
      cacheMap.set(item.date, item);
    }
  }

  // Build daily readings array
  const readings: DailyReading[] = allDates.map((date) => cacheMap.get(date)!);

  // Calculate totals across all days
  const totals: DailyTotals = {
    generationKwh: round(
      readings.reduce((sum, r) => sum + r.generationKwh, 0)
    ),
    importKwh: round(readings.reduce((sum, r) => sum + r.importKwh, 0)),
    exportKwh: round(readings.reduce((sum, r) => sum + r.exportKwh, 0)),
    consumptionKwh: round(
      readings.reduce((sum, r) => sum + r.consumptionKwh, 0)
    ),
  };

  return {
    success: true,
    data: {
      period,
      startDate,
      endDate,
      readings,
      totals,
    },
  };
}

// =============================================================================
// API Route Handler
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<HistoryResponse>> {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "day";
    const dateStr = searchParams.get("date");

    // Validate period parameter
    const validPeriods = ["day", "week", "month", "year"];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid period. Supported: day, week, month, year",
        },
        { status: 400 }
      );
    }

    // Create MyEnergi client
    const client = createMyEnergiClient();

    // Get device serials
    const [zappis, eddis] = await Promise.all([
      client.getStatusZappiAll(),
      client.getStatusEddiAll(),
    ]);

    const zappiSerial = zappis[0]?.sno?.toString();
    const eddiSerial = eddis[0]?.sno?.toString();

    if (!zappiSerial && !eddiSerial) {
      return NextResponse.json(
        {
          success: false,
          error: "No MyEnergi devices found",
        },
        { status: 404 }
      );
    }

    // Handle different period types
    if (period === "day") {
      // Parse and validate date
      const { date, error: dateError } = parseDate(dateStr);
      if (dateError) {
        return NextResponse.json(
          {
            success: false,
            error: dateError,
          },
          { status: 400 }
        );
      }

      const response = await handleDayRequest(
        client,
        zappiSerial,
        eddiSerial,
        date
      );
      return NextResponse.json(response);
    } else {
      // Handle week, month, year
      const response = await handleMultiDayRequest(
        client,
        zappiSerial,
        eddiSerial,
        period
      );
      return NextResponse.json(response);
    }
  } catch (error) {
    console.error("Error fetching historical energy data:", error);

    // Handle specific error types
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch historical energy data",
      },
      { status: 500 }
    );
  }
}
