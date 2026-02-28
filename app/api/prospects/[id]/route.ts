import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { electricityTariffs, tariffPeriods } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Type definition for prospect tariff update body.
 * Only switchingBonus can be updated.
 */
interface ProspectUpdateBody {
  switchingBonus?: number;
}

/**
 * PATCH /api/prospects/[id]
 *
 * Updates a prospect tariff's switching bonus.
 *
 * Business logic:
 * - Only switchingBonus field can be updated
 * - Returns the updated prospect tariff
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

    // Update the switchingBonus field
    const updateData: Partial<typeof electricityTariffs.$inferInsert> = {};
    if (body.switchingBonus !== undefined) {
      updateData.switchingBonus = body.switchingBonus;
    }

    // Only proceed with update if there are fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update the tariff record
    await db
      .update(electricityTariffs)
      .set(updateData)
      .where(eq(electricityTariffs.id, tariffId));

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
