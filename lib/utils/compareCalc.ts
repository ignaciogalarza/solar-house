/**
 * Compare Calculation Utilities
 *
 * Calculates electricity costs for given energy usage data against tariff structures.
 * Handles time-of-use rate matching, export revenue, standing charges, PSO levy, and VAT.
 */

// =============================================================================
// Types
// =============================================================================

export interface EnergyDayReading {
  date: string; // YYYY-MM-DD
  importKwh: number;
  exportKwh: number;
  generationKwh: number;
}

export interface TariffPeriod {
  rate: number;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  daysOfWeek: number[] | null; // 0=Sun, 1=Mon, ..., 6=Sat; null = all days
}

export interface TariffInfo {
  id: number;
  providerName: string | null;
  tariffName: string | null;
  exportRate: number | null;
  standingCharge: number | null;
  psoLevy: number | null; // Monthly PSO levy in EUR
  vatRate: number | null; // VAT as percentage (e.g. 9 for 9%)
  isCurrent: boolean | null;
}

export interface TariffComparison {
  tariffId: number;
  providerName: string;
  tariffName: string;
  importCost: number;
  exportRevenue: number;
  standingCharges: number;
  psoCharges: number;
  subtotal: number;
  vatAmount: number;
  netCost: number;
  isCurrent: boolean;
}

export interface UsageSummary {
  totalImportKwh: number;
  totalExportKwh: number;
  totalGenerationKwh: number;
  days: number;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Convert HH:MM string to minutes since midnight.
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Find the applicable rate (€/kWh) for a given hour and day of week
 * by matching against tariff periods.
 *
 * Handles overnight periods (e.g., 23:00–07:00) that wrap past midnight.
 * Returns the first matching period's rate, falling back to the first period's rate.
 *
 * @param hour - Hour of day (0–23)
 * @param dayOfWeek - Day of week (0=Sun, 1=Mon, ..., 6=Sat)
 * @param periods - Array of tariff rate periods
 */
export function findApplicableRate(
  hour: number,
  dayOfWeek: number,
  periods: TariffPeriod[]
): number {
  const timeInMinutes = hour * 60;

  for (const period of periods) {
    // Skip if this period doesn't apply to this day of week
    if (period.daysOfWeek !== null && !period.daysOfWeek.includes(dayOfWeek)) {
      continue;
    }

    const startMinutes = timeToMinutes(period.startTime);
    const endMinutes = timeToMinutes(period.endTime);

    // Overnight period: end time is before or equal to start time
    // e.g., 23:00–07:00: applies if time >= 23:00 OR time < 07:00
    if (endMinutes <= startMinutes) {
      if (timeInMinutes >= startMinutes || timeInMinutes < endMinutes) {
        return period.rate;
      }
    } else {
      // Normal period within same day: start <= time < end
      if (timeInMinutes >= startMinutes && timeInMinutes < endMinutes) {
        return period.rate;
      }
    }
  }

  // Fallback: first period's rate (covers any unconfigured hours)
  return periods.length > 0 ? periods[0].rate : 0;
}

// =============================================================================
// Core Calculation Functions
// =============================================================================

/**
 * Calculate total import cost for a set of daily readings against rate periods.
 *
 * Since daily readings represent a full day's totals, we match the rate using
 * noon (12:00) as the representative time for each day. This gives the "day" rate
 * for typical ToU tariffs, which is a reasonable approximation for daily aggregates.
 *
 * @param readings - Daily energy readings
 * @param periods - Tariff rate periods (with time ranges and day-of-week filters)
 */
export function calculateTariffCost(
  readings: EnergyDayReading[],
  periods: TariffPeriod[]
): number {
  let totalCost = 0;

  for (const reading of readings) {
    // Use noon as representative hour for daily totals
    const date = new Date(reading.date + "T12:00:00");
    const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat

    const rate = findApplicableRate(12, dayOfWeek, periods);
    totalCost += reading.importKwh * rate;
  }

  return totalCost;
}

/**
 * Calculate total export revenue for a set of daily readings.
 *
 * @param readings - Daily energy readings
 * @param exportRate - Export rate in €/kWh
 */
export function calculateExportRevenue(
  readings: EnergyDayReading[],
  exportRate: number
): number {
  const totalExportKwh = readings.reduce((sum, r) => sum + r.exportKwh, 0);
  return totalExportKwh * exportRate;
}

/**
 * Calculate the number of complete days in a date range (inclusive).
 */
export function getDaysInRange(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  return (
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
}

/**
 * Approximate number of months in a date range.
 */
function getMonthsInRange(startDate: string, endDate: string): number {
  return getDaysInRange(startDate, endDate) / 30;
}

/**
 * Calculate net cost including standing charges, PSO levy, and VAT.
 *
 * @param importCost - Total import cost in EUR
 * @param exportRevenue - Total export revenue in EUR
 * @param standingCharge - Daily standing charge in EUR
 * @param days - Number of days in the period
 * @param psoLevy - Monthly PSO levy in EUR (null if not applicable)
 * @param months - Number of months in the period
 * @param vatRate - VAT rate as percentage (null if not applicable)
 */
export function calculateNetCost(
  importCost: number,
  exportRevenue: number,
  standingCharge: number,
  days: number,
  psoLevy: number | null,
  months: number,
  vatRate: number | null
): {
  standingCharges: number;
  psoCharges: number;
  subtotal: number;
  vatAmount: number;
  netCost: number;
} {
  const standingCharges = standingCharge * days;
  const psoCharges = psoLevy != null ? psoLevy * months : 0;

  // Net of import minus export, plus fixed charges
  const subtotal = importCost - exportRevenue + standingCharges + psoCharges;
  const vatAmount = vatRate != null ? subtotal * (vatRate / 100) : 0;
  const netCost = subtotal + vatAmount;

  return { standingCharges, psoCharges, subtotal, vatAmount, netCost };
}

// =============================================================================
// Main Comparison Function
// =============================================================================

/**
 * Calculate a full tariff comparison for a set of daily energy readings.
 *
 * @param tariff - Tariff metadata (rates, charges, IDs)
 * @param periods - Rate periods for this tariff
 * @param readings - Daily energy readings for the analysis period
 * @param startDate - Start of analysis period (YYYY-MM-DD)
 * @param endDate - End of analysis period (YYYY-MM-DD)
 */
export function compareTariff(
  tariff: TariffInfo,
  periods: TariffPeriod[],
  readings: EnergyDayReading[],
  startDate: string,
  endDate: string
): TariffComparison {
  const days = getDaysInRange(startDate, endDate);
  const months = getMonthsInRange(startDate, endDate);

  const importCost = calculateTariffCost(readings, periods);
  const exportRevenue = calculateExportRevenue(readings, tariff.exportRate ?? 0);

  const { standingCharges, psoCharges, subtotal, vatAmount, netCost } =
    calculateNetCost(
      importCost,
      exportRevenue,
      tariff.standingCharge ?? 0,
      days,
      tariff.psoLevy ?? null,
      months,
      tariff.vatRate ?? null
    );

  return {
    tariffId: tariff.id,
    providerName: tariff.providerName ?? "Unknown",
    tariffName: tariff.tariffName ?? "Unknown",
    importCost,
    exportRevenue,
    standingCharges,
    psoCharges,
    subtotal,
    vatAmount,
    netCost,
    isCurrent: tariff.isCurrent ?? false,
  };
}

/**
 * Calculate usage summary across all readings.
 */
export function getUsageSummary(
  readings: EnergyDayReading[],
  startDate: string,
  endDate: string
): UsageSummary {
  return {
    totalImportKwh: readings.reduce((sum, r) => sum + r.importKwh, 0),
    totalExportKwh: readings.reduce((sum, r) => sum + r.exportKwh, 0),
    totalGenerationKwh: readings.reduce((sum, r) => sum + r.generationKwh, 0),
    days: getDaysInRange(startDate, endDate),
  };
}
