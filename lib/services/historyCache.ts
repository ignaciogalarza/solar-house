import { db } from '../db';
import { energyReadings } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export interface DailyData {
  date: string;
  generationKwh: number;
  importKwh: number;
  exportKwh: number;
  consumptionKwh: number;
}

/**
 * Check if a date's data exists in the database cache.
 * Returns aggregated daily data for the specified date or null if no data exists.
 * 
 * @param date - Date in YYYY-MM-DD format
 * @returns DailyData object or null if no data exists for that date
 */
export async function getDailyFromCache(date: string): Promise<DailyData | null> {
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const result = await db
    .select({
      totalGeneration: sql<number>`COALESCE(SUM(${energyReadings.solarGenerationWh}), 0)`,
      totalImport: sql<number>`COALESCE(SUM(${energyReadings.gridImportWh}), 0)`,
      totalExport: sql<number>`COALESCE(SUM(${energyReadings.gridExportWh}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(energyReadings)
    .where(
      and(
        gte(energyReadings.timestamp, startOfDay),
        lte(energyReadings.timestamp, endOfDay)
      )
    );

  if (!result[0] || result[0].count === 0) {
    return null;
  }

  const generationKwh = result[0].totalGeneration / 1000;
  const importKwh = result[0].totalImport / 1000;
  const exportKwh = result[0].totalExport / 1000;
  const consumptionKwh = generationKwh + importKwh - exportKwh;

  return {
    date,
    generationKwh: Number(generationKwh.toFixed(3)),
    importKwh: Number(importKwh.toFixed(3)),
    exportKwh: Number(exportKwh.toFixed(3)),
    consumptionKwh: Number(consumptionKwh.toFixed(3)),
  };
}

/**
 * Store a day's aggregated energy data in the database cache.
 * This creates individual timestamp entries for the daily totals.
 * 
 * Note: This stores a single reading representing the day's totals.
 * For proper time-series data, consider storing hourly or more granular readings.
 * 
 * @param date - Date in YYYY-MM-DD format
 * @param data - DailyData object containing the day's aggregated values
 */
export async function storeDailyToCache(date: string, data: DailyData): Promise<void> {
  const timestamp = `${date}T12:00:00.000Z`; // Store at midday to represent daily total

  // Check if entry already exists
  const existing = await db
    .select()
    .from(energyReadings)
    .where(eq(energyReadings.timestamp, timestamp))
    .limit(1);

  const values = {
    timestamp,
    solarGenerationWh: Math.round(data.generationKwh * 1000),
    gridImportWh: Math.round(data.importKwh * 1000),
    gridExportWh: Math.round(data.exportKwh * 1000),
  };

  if (existing.length > 0) {
    // Update existing entry
    await db
      .update(energyReadings)
      .set(values)
      .where(eq(energyReadings.timestamp, timestamp));
  } else {
    // Insert new entry
    await db.insert(energyReadings).values(values);
  }
}

/**
 * Get multiple days of data from cache for aggregation purposes.
 * Useful for weekly, monthly, or yearly views.
 * 
 * @param startDate - Start date in YYYY-MM-DD format (inclusive)
 * @param endDate - End date in YYYY-MM-DD format (inclusive)
 * @returns Array of DailyData objects, one per day with available data
 */
export async function getMultipleDaysFromCache(
  startDate: string,
  endDate: string
): Promise<DailyData[]> {
  const startTimestamp = `${startDate}T00:00:00.000Z`;
  const endTimestamp = `${endDate}T23:59:59.999Z`;

  // Get all readings in the date range grouped by date
  const results = await db
    .select({
      date: sql<string>`DATE(${energyReadings.timestamp})`,
      totalGeneration: sql<number>`COALESCE(SUM(${energyReadings.solarGenerationWh}), 0)`,
      totalImport: sql<number>`COALESCE(SUM(${energyReadings.gridImportWh}), 0)`,
      totalExport: sql<number>`COALESCE(SUM(${energyReadings.gridExportWh}), 0)`,
    })
    .from(energyReadings)
    .where(
      and(
        gte(energyReadings.timestamp, startTimestamp),
        lte(energyReadings.timestamp, endTimestamp)
      )
    )
    .groupBy(sql`DATE(${energyReadings.timestamp})`)
    .orderBy(sql`DATE(${energyReadings.timestamp})`);

  return results.map((row) => {
    const generationKwh = row.totalGeneration / 1000;
    const importKwh = row.totalImport / 1000;
    const exportKwh = row.totalExport / 1000;
    const consumptionKwh = generationKwh + importKwh - exportKwh;

    return {
      date: row.date,
      generationKwh: Number(generationKwh.toFixed(3)),
      importKwh: Number(importKwh.toFixed(3)),
      exportKwh: Number(exportKwh.toFixed(3)),
      consumptionKwh: Number(consumptionKwh.toFixed(3)),
    };
  });
}
