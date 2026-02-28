import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { electricityTariffs, tariffPeriods } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getMultipleDaysFromCache } from '@/lib/services/historyCache';
import {
  compareTariff,
  getUsageSummary,
  TariffInfo,
  TariffPeriod,
  EnergyDayReading,
  TariffComparison,
  UsageSummary,
} from '@/lib/utils/compareCalc';

interface PeriodSummary {
  name: string | null;
  rate: number | null;
}

interface CompareResponse {
  success: boolean;
  data?: {
    startDate: string;
    endDate: string;
    usage: UsageSummary;
    exitFee: number;
    comparisons: Array<TariffComparison & { isBest: boolean; savings: number; periods: PeriodSummary[]; isProspect: boolean; switchingBonus: number }>;
  };
  error?: string;
}

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const endDate = yesterday.toISOString().split('T')[0];

  const startDate = new Date(yesterday);
  startDate.setDate(startDate.getDate() - 29);
  const formattedStartDate = startDate.toISOString().split('T')[0];

  return { startDate: formattedStartDate, endDate };
}

function parseDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr + 'T00:00:00Z');
  return date instanceof Date && !isNaN(date.getTime());
}

export async function GET(request: NextRequest): Promise<NextResponse<CompareResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: string;
    let endDate: string;

    if (!startDateParam || !endDateParam) {
      const defaults = getDefaultDateRange();
      startDate = defaults.startDate;
      endDate = defaults.endDate;
    } else {
      if (!parseDate(startDateParam) || !parseDate(endDateParam)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid date format. Use YYYY-MM-DD.',
          },
          { status: 400 }
        );
      }
      startDate = startDateParam;
      endDate = endDateParam;
    }

    const tariffs = await db
      .select()
      .from(electricityTariffs)
      .orderBy(desc(electricityTariffs.isCurrent), desc(electricityTariffs.validFrom));

    if (tariffs.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          startDate,
          endDate,
          usage: {
            totalImportKwh: 0,
            totalExportKwh: 0,
            totalGenerationKwh: 0,
            days: 0,
          },
          exitFee: 0,
          comparisons: [],
        },
      });
    }

    const tariffPeriodsList = await Promise.all(
      tariffs.map(async (tariff) => {
        const periods = await db.select().from(tariffPeriods).where(eq(tariffPeriods.tariffId, tariff.id));
        return { tariffId: tariff.id, periods };
      })
    );

    const periodsByTariffId = new Map(tariffPeriodsList.map((item) => [item.tariffId, item.periods]));

    const readings = await getMultipleDaysFromCache(startDate, endDate);

    const energyDayReadings: EnergyDayReading[] = readings.map((r) => ({
      date: r.date,
      importKwh: r.importKwh,
      exportKwh: r.exportKwh,
      generationKwh: r.generationKwh,
    }));

    const rawComparisons = tariffs.map((tariff) => {
      const rawPeriods = periodsByTariffId.get(tariff.id) || [];

      const parsedPeriods: TariffPeriod[] = rawPeriods.map((p) => ({
        rate: p.rate ?? 0,
        startTime: p.startTime ?? '00:00',
        endTime: p.endTime ?? '00:00',
        daysOfWeek: p.daysOfWeek ? JSON.parse(p.daysOfWeek) : null,
      }));

      const tariffInfo: TariffInfo = {
        id: tariff.id,
        providerName: tariff.providerName,
        tariffName: tariff.tariffName,
        exportRate: tariff.exportRate,
        standingCharge: tariff.standingCharge,
        psoLevy: tariff.psoLevy,
        vatRate: tariff.vatRate,
        isCurrent: tariff.isCurrent,
      };

      const comparison = compareTariff(tariffInfo, parsedPeriods, energyDayReadings, startDate, endDate);
      const periodSummaries: PeriodSummary[] = rawPeriods.map((p) => ({ name: p.name, rate: p.rate }));

      return { ...comparison, periods: periodSummaries, isProspect: tariff.isProspect ?? false, switchingBonus: tariff.switchingBonus ?? 0 };
    });

    const currentTariffRow = tariffs.find(t => t.isCurrent);
    const exitFee = currentTariffRow?.exitFee ?? 0;

    const sorted = rawComparisons
      .sort((a, b) => a.netCost - b.netCost)
      .map((comparison, index) => ({ ...comparison, isBest: index === 0 }));

    const currentTariff = sorted.find((c) => c.isCurrent);
    const baselineCost = (currentTariff || sorted[0])?.netCost ?? 0;

    const comparisonsWithSavings = sorted.map((comparison) => ({
      ...comparison,
      savings: baselineCost - comparison.netCost,
    }));

    const usage = getUsageSummary(energyDayReadings, startDate, endDate);

    return NextResponse.json({
      success: true,
      data: {
        startDate,
        endDate,
        usage,
        exitFee,
        comparisons: comparisonsWithSavings,
      },
    });
  } catch (error) {
    console.error('Error comparing tariffs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to compare tariffs',
      },
      { status: 500 }
    );
  }
}
