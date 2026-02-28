import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { electricityTariffs, tariffPeriods } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Type definition for a tariff period in the request body.
 * Represents time-based pricing periods (day, night, peak, ev, etc.)
 */
interface ProspectPeriodInput {
  name: string;           // Period name: 'day', 'night', 'peak', 'ev'
  rate: number;           // Rate in €/kWh
  startTime: string;      // Start time in 'HH:MM' format
  endTime: string;        // End time in 'HH:MM' format
  daysOfWeek?: number[];  // Optional: days when this period applies [0-6], null = all days
}

/**
 * Type definition for prospect tariff request body (POST operation).
 * Prospect tariffs are future tariffs being considered (not yet active).
 */
interface ProspectTariffRequestBody {
  providerName: string;
  tariffName: string;
  exportRate?: number;
  standingCharge?: number;
  switchingBonus?: number;  // One-time credit from new provider
  periods: ProspectPeriodInput[];
}

/**
 * GET /api/prospects
 *
 * Retrieves all prospect (future) electricity tariffs with their periods.
 * Prospect tariffs are tariffs being evaluated but not yet active (isProspect=true, isCurrent=false).
 *
 * @param request - Next.js request object
 * @returns JSON response with array of prospect tariffs, each with embedded periods
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch all prospect tariffs ordered by creation date (newest first)
    const prospects = await db
      .select()
      .from(electricityTariffs)
      .where(eq(electricityTariffs.isProspect, true))
      .orderBy(desc(electricityTariffs.createdAt));

    // For each prospect, fetch its associated periods
    const prospectsList = await Promise.all(
      prospects.map(async (prospect) => {
        const periods = await db
          .select()
          .from(tariffPeriods)
          .where(eq(tariffPeriods.tariffId, prospect.id));

        // Parse daysOfWeek from JSON string to array for each period
        const periodsWithParsedDays = periods.map(period => ({
          ...period,
          daysOfWeek: period.daysOfWeek ? JSON.parse(period.daysOfWeek) : null
        }));

        return {
          ...prospect,
          periods: periodsWithParsedDays
        };
      })
    );

    return NextResponse.json(prospectsList);

  } catch (error) {
    console.error('Error fetching prospect tariffs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prospect tariffs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prospects
 *
 * Creates a new prospect (future) electricity tariff with its associated time periods.
 * Prospect tariffs have isProspect=true and isCurrent=false.
 *
 * Business logic:
 * - validFrom defaults to today's date
 * - tariffType defaults to 'day_night'
 * - All periods are stored with daysOfWeek as JSON string
 *
 * @param request - Next.js request containing prospect tariff data in JSON body
 * @returns JSON response with created prospect tariff (201) or error message
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body: ProspectTariffRequestBody = await request.json();

    // Validate required fields
    if (!body.providerName || !body.tariffName) {
      return NextResponse.json(
        { error: 'Missing required fields: providerName, tariffName' },
        { status: 400 }
      );
    }

    // Validate that at least one period is provided
    if (!body.periods || body.periods.length === 0) {
      return NextResponse.json(
        { error: 'At least one tariff period is required' },
        { status: 400 }
      );
    }

    // Validate period data structure
    for (const period of body.periods) {
      if (!period.name || period.rate === undefined || !period.startTime || !period.endTime) {
        return NextResponse.json(
          { error: 'Each period must have name, rate, startTime, and endTime' },
          { status: 400 }
        );
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(period.startTime) || !timeRegex.test(period.endTime)) {
        return NextResponse.json(
          { error: 'Time must be in HH:MM format (e.g., 09:00, 23:30)' },
          { status: 400 }
        );
      }
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Insert the new prospect tariff into the database
    const result = await db
      .insert(electricityTariffs)
      .values({
        providerName: body.providerName,
        tariffName: body.tariffName,
        tariffType: 'day_night',  // Default tariff type
        isCurrent: false,         // Prospect tariffs are never current
        isProspect: true,         // Mark as prospect tariff
        exportRate: body.exportRate ?? null,
        standingCharge: body.standingCharge ?? null,
        switchingBonus: body.switchingBonus ?? null,
        validFrom: today,         // Default to today
        validTo: null,
        psoLevy: null,
        vatRate: null,
        exitFee: null,
      })
      .returning();

    // Get the ID of the newly created tariff
    const newTariffId = result[0].id;

    // Insert all the tariff periods
    const periodsToInsert = body.periods.map(period => ({
      tariffId: newTariffId,
      name: period.name,
      rate: period.rate,
      startTime: period.startTime,
      endTime: period.endTime,
      // Convert daysOfWeek array to JSON string for storage
      daysOfWeek: period.daysOfWeek ? JSON.stringify(period.daysOfWeek) : null,
    }));

    await db
      .insert(tariffPeriods)
      .values(periodsToInsert);

    // Fetch the complete prospect tariff with its periods to return to client
    const createdTariff = await db
      .select()
      .from(electricityTariffs)
      .where(eq(electricityTariffs.id, newTariffId))
      .limit(1);

    const createdPeriods = await db
      .select()
      .from(tariffPeriods)
      .where(eq(tariffPeriods.tariffId, newTariffId));

    // Parse daysOfWeek back to array format for the response
    const periodsWithParsedDays = createdPeriods.map(period => ({
      ...period,
      daysOfWeek: period.daysOfWeek ? JSON.parse(period.daysOfWeek) : null
    }));

    // Return the created prospect tariff with embedded periods
    return NextResponse.json(
      {
        ...createdTariff[0],
        periods: periodsWithParsedDays
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating prospect tariff:', error);
    return NextResponse.json(
      { error: 'Failed to create prospect tariff' },
      { status: 500 }
    );
  }
}
