import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { electricityTariffs, tariffPeriods } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Type definition for a tariff period in the update request.
 */
interface PeriodInput {
  name: string;
  rate: number;
  startTime: string;
  endTime: string;
  daysOfWeek?: number[];
}

/**
 * Type definition for prospect tariff update body.
 * Supports full prospect updates including tariff details and periods.
 */
interface ProspectUpdateBody {
  switchingBonus?: number;
  providerName?: string;
  tariffName?: string;
  exportRate?: number | null;
  standingCharge?: number | null;
  periods?: PeriodInput[];
}

/**
 * PATCH /api/prospects/[id]
 *
 * Updates a prospect tariff with full support for tariff details and periods.
 *
 * Business logic:
 * - Supports updating: switchingBonus, providerName, tariffName, exportRate, standingCharge
 * - When periods is provided, deletes all existing tariffPeriods and inserts new ones
 * - Returns the updated prospect tariff with all periods
 *
 * @param request - Next.js request containing update data
 * @param params - Route parameters containing tariff id
 * @returns JSON response with updated prospect tariff or error message
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Parse and validate the request body
    const body: ProspectUpdateBody = await request.json();

    // Parse the ID from the route parameter
    const { id } = await params;
    const tariffId = parseInt(id);

    // Validate that the ID is a valid number
    if (isNaN(tariffId)) {
      return NextResponse.json(
        { error: 'Invalid prospect tariff ID' },
        { status: 400 }
      );
    }

    // Check if the prospect tariff exists
    const existingTariff = await db
      .select()
      .from(electricityTariffs)
      .where(eq(electricityTariffs.id, tariffId))
      .limit(1);

    if (existingTariff.length === 0) {
      return NextResponse.json(
        { error: 'Prospect tariff not found' },
        { status: 404 }
      );
    }

    // Verify it's actually a prospect tariff
    if (!existingTariff[0].isProspect) {
      return NextResponse.json(
        { error: 'This tariff is not a prospect tariff' },
        { status: 400 }
      );
    }

    // Build the tariff update data
    const updateData: Partial<typeof electricityTariffs.$inferInsert> = {};
    if (body.switchingBonus !== undefined) {
      updateData.switchingBonus = body.switchingBonus;
    }
    if (body.providerName !== undefined) {
      updateData.providerName = body.providerName;
    }
    if (body.tariffName !== undefined) {
      updateData.tariffName = body.tariffName;
    }
    if (body.exportRate !== undefined) {
      updateData.exportRate = body.exportRate;
    }
    if (body.standingCharge !== undefined) {
      updateData.standingCharge = body.standingCharge;
    }

    // Update the tariff record if there are fields to update
    if (Object.keys(updateData).length > 0) {
      await db
        .update(electricityTariffs)
        .set(updateData)
        .where(eq(electricityTariffs.id, tariffId));
    }

    // Handle periods update if provided
    if (body.periods !== undefined) {
      // Delete all existing periods for this tariff
      await db
        .delete(tariffPeriods)
        .where(eq(tariffPeriods.tariffId, tariffId));

      // Insert new periods if any provided
      if (body.periods.length > 0) {
        const periodInserts = body.periods.map(period => ({
          tariffId,
          name: period.name,
          rate: period.rate,
          startTime: period.startTime,
          endTime: period.endTime,
          daysOfWeek: period.daysOfWeek ? JSON.stringify(period.daysOfWeek) : null
        }));

        await db.insert(tariffPeriods).values(periodInserts);
      }
    }

    // Validate that at least one field was updated
    if (Object.keys(updateData).length === 0 && body.periods === undefined) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Fetch the updated tariff with its periods
    const updatedTariff = await db
      .select()
      .from(electricityTariffs)
      .where(eq(electricityTariffs.id, tariffId))
      .limit(1);

    const periods = await db
      .select()
      .from(tariffPeriods)
      .where(eq(tariffPeriods.tariffId, tariffId));

    // Parse daysOfWeek back to array format for the response
    const periodsWithParsedDays = periods.map(period => ({
      ...period,
      daysOfWeek: period.daysOfWeek ? JSON.parse(period.daysOfWeek) : null
    }));

    // Return the updated prospect tariff with embedded periods
    return NextResponse.json({
      ...updatedTariff[0],
      periods: periodsWithParsedDays
    });

  } catch (error) {
    console.error('Error updating prospect tariff:', error);
    return NextResponse.json(
      { error: 'Failed to update prospect tariff' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/prospects/[id]
 *
 * Deletes a prospect tariff and all its associated time periods.
 * This is a cascading delete operation.
 *
 * Note: We explicitly delete periods first for clarity and to ensure data consistency.
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing tariff id
 * @returns JSON response with success message or error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Parse the ID from the route parameter
    const { id } = await params;
    const tariffId = parseInt(id);

    // Validate that the ID is a valid number
    if (isNaN(tariffId)) {
      return NextResponse.json(
        { error: 'Invalid prospect tariff ID' },
        { status: 400 }
      );
    }

    // Check if the prospect tariff exists before attempting to delete
    const existingTariff = await db
      .select()
      .from(electricityTariffs)
      .where(eq(electricityTariffs.id, tariffId))
      .limit(1);

    if (existingTariff.length === 0) {
      return NextResponse.json(
        { error: 'Prospect tariff not found' },
        { status: 404 }
      );
    }

    // STEP 1: Delete all associated tariff periods first
    // This ensures data consistency even if foreign key constraints aren't set up
    await db
      .delete(tariffPeriods)
      .where(eq(tariffPeriods.tariffId, tariffId));

    // STEP 2: Delete the prospect tariff itself
    await db
      .delete(electricityTariffs)
      .where(eq(electricityTariffs.id, tariffId));

    // Return success message
    return NextResponse.json({
      message: 'Prospect tariff deleted successfully',
      id: tariffId
    });

  } catch (error) {
    console.error('Error deleting prospect tariff:', error);
    return NextResponse.json(
      { error: 'Failed to delete prospect tariff' },
      { status: 500 }
    );
  }
}
