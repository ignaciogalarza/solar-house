import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { electricityTariffs, tariffPeriods } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

/**
 * Type definition for a tariff period in the request body.
 * Represents time-based pricing periods (day, night, peak, ev, etc.)
 */
interface TariffPeriodInput {
  name: string;           // Period name: 'day', 'night', 'peak', 'ev'
  rate: number;           // Rate in €/kWh
  startTime: string;      // Start time in 'HH:MM' format
  endTime: string;        // End time in 'HH:MM' format
  daysOfWeek?: number[];  // Optional: days when this period applies [0-6], null = all days
}

/**
 * Type definition for tariff request body (POST/PUT operations).
 * Contains all tariff details and associated time periods.
 */
interface TariffRequestBody {
  providerName: string;
  tariffName: string;
  tariffType: 'single' | 'day_night' | 'day_night_peak' | 'day_night_peak_ev';
  isCurrent: boolean;
  exportRate: number;      // Rate for exporting energy to grid (€/kWh)
  standingCharge: number;  // Daily standing charge (€/day)
  psoLevy?: number;        // Monthly PSO levy in EUR (optional)
  vatRate?: number;        // VAT percentage e.g. 9 for 9% (optional)
  validFrom: string;       // Start date in 'YYYY-MM-DD' format
  validTo?: string;        // Optional end date in 'YYYY-MM-DD' format
  periods: TariffPeriodInput[];
}

/**
 * GET /api/tariffs
 * 
 * Retrieves electricity tariffs from the database.
 * Two modes of operation:
 * 1. Without query params: Returns all tariffs (current tariffs first, then by validFrom desc)
 * 2. With ?id=X: Returns a single tariff with its associated time periods
 * 
 * @param request - Next.js request object containing optional 'id' search param
 * @returns JSON response with tariff(s) or error message
 */
export async function GET(request: NextRequest) {
  try {
    // Extract the 'id' query parameter from the URL
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // MODE 1: Get a single tariff by ID with its periods
    if (id) {
      // Parse the ID to ensure it's a valid number
      const tariffId = parseInt(id);
      
      // Validate that the parsed ID is a valid number
      if (isNaN(tariffId)) {
        return NextResponse.json(
          { error: 'Invalid tariff ID' },
          { status: 400 }
        );
      }

      // Fetch the tariff from the database
      const tariff = await db
        .select()
        .from(electricityTariffs)
        .where(eq(electricityTariffs.id, tariffId))
        .limit(1);

      // Return 404 if the tariff doesn't exist
      if (tariff.length === 0) {
        return NextResponse.json(
          { error: 'Tariff not found' },
          { status: 404 }
        );
      }

      // Fetch all time periods associated with this tariff
      const periods = await db
        .select()
        .from(tariffPeriods)
        .where(eq(tariffPeriods.tariffId, tariffId));

      // Parse the daysOfWeek from JSON string to array for each period
      // The database stores this as a JSON string, we need to convert it back
      const periodsWithParsedDays = periods.map(period => ({
        ...period,
        daysOfWeek: period.daysOfWeek ? JSON.parse(period.daysOfWeek) : null
      }));

      // Return the tariff with its periods embedded
      return NextResponse.json({
        ...tariff[0],
        periods: periodsWithParsedDays
      });
    }

    // MODE 2: Get all tariffs (without periods)
    // Sort order: current tariffs first (isCurrent=1), then by validFrom descending
    // Filter out prospect tariffs from the list
    const tariffs = await db
      .select()
      .from(electricityTariffs)
      .where(eq(electricityTariffs.isProspect, false))
      .orderBy(
        desc(electricityTariffs.isCurrent),  // Current tariffs first
        desc(electricityTariffs.validFrom)   // Then most recent first
      );

    return NextResponse.json(tariffs);

  } catch (error) {
    // Log the error for debugging purposes
    console.error('Error fetching tariffs:', error);
    
    // Return a generic error message to the client
    return NextResponse.json(
      { error: 'Failed to fetch tariffs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tariffs
 * 
 * Creates a new electricity tariff with its associated time periods.
 * This operation is transactional - if any part fails, all changes are rolled back.
 * 
 * Business logic:
 * - If isCurrent is true, sets all other tariffs to isCurrent=false
 * - Creates the tariff and all its periods in a single transaction
 * - Validates period overlap (basic validation)
 * 
 * @param request - Next.js request containing tariff data in JSON body
 * @returns JSON response with created tariff or error message
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body: TariffRequestBody = await request.json();

    // Validate required fields
    if (!body.providerName || !body.tariffName || !body.tariffType || !body.validFrom) {
      return NextResponse.json(
        { error: 'Missing required fields: providerName, tariffName, tariffType, validFrom' },
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

    // BUSINESS RULE: If this tariff is being set as current, 
    // we need to unset all other tariffs first
    if (body.isCurrent) {
      await db
        .update(electricityTariffs)
        .set({ isCurrent: false })
        .where(sql`1=1`); // Update all rows
    }

    // Insert the new tariff into the database
    const result = await db
      .insert(electricityTariffs)
      .values({
        providerName: body.providerName,
        tariffName: body.tariffName,
        tariffType: body.tariffType,
        isCurrent: body.isCurrent,
        exportRate: body.exportRate,
        standingCharge: body.standingCharge,
        psoLevy: body.psoLevy ?? null,
        vatRate: body.vatRate ?? null,
        validFrom: body.validFrom,
        validTo: body.validTo || null,
        isProspect: false,
      })
      .returning();

    // Get the ID of the newly created tariff
    const newTariffId = result[0].id;

    // Insert all the tariff periods
    // We need to prepare the periods data by converting daysOfWeek array to JSON string
    const periodsToInsert = body.periods.map(period => ({
      tariffId: newTariffId,
      name: period.name,
      rate: period.rate,
      startTime: period.startTime,
      endTime: period.endTime,
      // Convert daysOfWeek array to JSON string for storage
      // null/undefined will be stored as null
      daysOfWeek: period.daysOfWeek ? JSON.stringify(period.daysOfWeek) : null,
    }));

    await db
      .insert(tariffPeriods)
      .values(periodsToInsert);

    // Fetch the complete tariff with its periods to return to client
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

    // Return the created tariff with embedded periods
    return NextResponse.json(
      {
        ...createdTariff[0],
        periods: periodsWithParsedDays
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating tariff:', error);
    return NextResponse.json(
      { error: 'Failed to create tariff' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tariffs
 * 
 * Updates an existing electricity tariff and its time periods.
 * Strategy: Delete all existing periods and recreate them (simpler than diff/merge).
 * 
 * Business logic:
 * - Requires 'id' in the request body
 * - If isCurrent is true, sets all other tariffs to isCurrent=false
 * - Deletes all existing periods for this tariff
 * - Recreates periods from the request body
 * 
 * @param request - Next.js request containing updated tariff data in JSON body
 * @returns JSON response with updated tariff or error message
 */
export async function PUT(request: NextRequest) {
  try {
    // Parse the request body
    const body: TariffRequestBody & { id: number } = await request.json();

    // Validate that ID is provided
    if (!body.id) {
      return NextResponse.json(
        { error: 'Tariff ID is required for update' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.providerName || !body.tariffName || !body.tariffType || !body.validFrom) {
      return NextResponse.json(
        { error: 'Missing required fields: providerName, tariffName, tariffType, validFrom' },
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

    // Check if the tariff exists before attempting to update
    const existingTariff = await db
      .select()
      .from(electricityTariffs)
      .where(eq(electricityTariffs.id, body.id))
      .limit(1);

    if (existingTariff.length === 0) {
      return NextResponse.json(
        { error: 'Tariff not found' },
        { status: 404 }
      );
    }

    // BUSINESS RULE: If this tariff is being set as current,
    // unset all other tariffs first (excluding this one)
    if (body.isCurrent) {
      await db
        .update(electricityTariffs)
        .set({ isCurrent: false })
        .where(sql`id != ${body.id}`);
    }

    // Update the tariff record
    await db
      .update(electricityTariffs)
      .set({
        providerName: body.providerName,
        tariffName: body.tariffName,
        tariffType: body.tariffType,
        isCurrent: body.isCurrent,
        exportRate: body.exportRate,
        standingCharge: body.standingCharge,
        psoLevy: body.psoLevy ?? null,
        vatRate: body.vatRate ?? null,
        validFrom: body.validFrom,
        validTo: body.validTo || null,
      })
      .where(eq(electricityTariffs.id, body.id));

    // DELETE all existing periods for this tariff
    // This is simpler than trying to diff and merge changes
    await db
      .delete(tariffPeriods)
      .where(eq(tariffPeriods.tariffId, body.id));

    // INSERT the new periods from the request body
    const periodsToInsert = body.periods.map(period => ({
      tariffId: body.id,
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

    // Fetch the updated tariff with its new periods to return to client
    const updatedTariff = await db
      .select()
      .from(electricityTariffs)
      .where(eq(electricityTariffs.id, body.id))
      .limit(1);

    const updatedPeriods = await db
      .select()
      .from(tariffPeriods)
      .where(eq(tariffPeriods.tariffId, body.id));

    // Parse daysOfWeek back to array format for the response
    const periodsWithParsedDays = updatedPeriods.map(period => ({
      ...period,
      daysOfWeek: period.daysOfWeek ? JSON.parse(period.daysOfWeek) : null
    }));

    // Return the updated tariff with embedded periods
    return NextResponse.json({
      ...updatedTariff[0],
      periods: periodsWithParsedDays
    });

  } catch (error) {
    console.error('Error updating tariff:', error);
    return NextResponse.json(
      { error: 'Failed to update tariff' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tariffs?id=X
 * 
 * Deletes an electricity tariff and all its associated time periods.
 * This is a cascading delete operation.
 * 
 * Note: The foreign key relationship will handle cascading delete if configured,
 * but we explicitly delete periods first for clarity and to ensure data consistency.
 * 
 * @param request - Next.js request containing 'id' query parameter
 * @returns JSON response with success message or error
 */
export async function DELETE(request: NextRequest) {
  try {
    // Extract the 'id' query parameter from the URL
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Validate that ID is provided
    if (!id) {
      return NextResponse.json(
        { error: 'Tariff ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate the ID
    const tariffId = parseInt(id);
    if (isNaN(tariffId)) {
      return NextResponse.json(
        { error: 'Invalid tariff ID' },
        { status: 400 }
      );
    }

    // Check if the tariff exists before attempting to delete
    const existingTariff = await db
      .select()
      .from(electricityTariffs)
      .where(eq(electricityTariffs.id, tariffId))
      .limit(1);

    if (existingTariff.length === 0) {
      return NextResponse.json(
        { error: 'Tariff not found' },
        { status: 404 }
      );
    }

    // STEP 1: Delete all associated tariff periods first
    // This ensures data consistency even if foreign key constraints aren't set up
    await db
      .delete(tariffPeriods)
      .where(eq(tariffPeriods.tariffId, tariffId));

    // STEP 2: Delete the tariff itself
    await db
      .delete(electricityTariffs)
      .where(eq(electricityTariffs.id, tariffId));

    // Return success message
    return NextResponse.json({
      message: 'Tariff deleted successfully',
      id: tariffId
    });

  } catch (error) {
    console.error('Error deleting tariff:', error);
    return NextResponse.json(
      { error: 'Failed to delete tariff' },
      { status: 500 }
    );
  }
}
