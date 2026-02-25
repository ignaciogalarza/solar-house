/**
 * Historical Energy Data API Route
 *
 * GET /api/energy/history?period=day&date=2026-02-25
 *
 * Returns hourly energy readings for the specified date from the MyEnergi API.
 */

import { NextRequest, NextResponse } from "next/server";
import { createMyEnergiClient } from "@/lib/myenergi";
import type { DayHourResponse } from "@/lib/myenergi/types";

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

interface DailyTotals {
  generationKwh: number;
  importKwh: number;
  exportKwh: number;
  consumptionKwh: number;
}

interface HistoryResponse {
  success: boolean;
  data?: {
    period: string;
    date: string;
    readings: HourlyReading[];
    totals: DailyTotals;
  };
  error?: string;
}

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
    if (period !== "day") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid period. Only 'day' is currently supported",
        },
        { status: 400 }
      );
    }

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
      // Find data for this hour
      const zappiHour = zappiHours.find((h) => h.hr === hour);
      const eddiHour = eddiHours.find((h) => h.hr === hour);

      // Extract values (in Joules)
      // Prefer Zappi data, fallback to Eddi
      const generationJ = zappiHour?.gep ?? eddiHour?.gep ?? 0;
      const importJ = zappiHour?.imp ?? eddiHour?.imp ?? 0;
      const exportJ = zappiHour?.exp ?? eddiHour?.exp ?? 0;

      // Convert to kWh
      const generationKwh = joulesToKwh(generationJ);
      const importKwh = joulesToKwh(importJ);
      const exportKwh = joulesToKwh(exportJ);

      // Calculate consumption: generation + import - export
      const consumptionKwh = generationKwh + importKwh - exportKwh;

      readings.push({
        hour,
        generationKwh: round(generationKwh),
        importKwh: round(importKwh),
        exportKwh: round(exportKwh),
        consumptionKwh: round(consumptionKwh),
      });

      // Accumulate totals
      totalGeneration += generationJ;
      totalImport += importJ;
      totalExport += exportJ;
    }

    // Calculate totals
    const totals: DailyTotals = {
      generationKwh: round(joulesToKwh(totalGeneration)),
      importKwh: round(joulesToKwh(totalImport)),
      exportKwh: round(joulesToKwh(totalExport)),
      consumptionKwh: round(
        joulesToKwh(totalGeneration + totalImport - totalExport)
      ),
    };

    // Format date as YYYY-MM-DD
    const formattedDate = date.toISOString().split("T")[0];

    return NextResponse.json({
      success: true,
      data: {
        period,
        date: formattedDate,
        readings,
        totals,
      },
    });
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
