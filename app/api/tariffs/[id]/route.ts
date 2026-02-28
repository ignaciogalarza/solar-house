import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { electricityTariffs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * PATCH /api/tariffs/[id]
 *
 * Partially updates a tariff. Currently supports updating exitFee only.
 * Used by the Compare page to save per-tariff switching costs.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tariffId = parseInt(id);
    if (isNaN(tariffId)) {
      return NextResponse.json({ error: 'Invalid tariff ID' }, { status: 400 });
    }

    const body: { exitFee?: number } = await request.json();

    const existing = await db
      .select()
      .from(electricityTariffs)
      .where(eq(electricityTariffs.id, tariffId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Tariff not found' }, { status: 404 });
    }

    if (body.exitFee !== undefined) {
      await db
        .update(electricityTariffs)
        .set({ exitFee: body.exitFee })
        .where(eq(electricityTariffs.id, tariffId));
    }

    const updated = await db
      .select()
      .from(electricityTariffs)
      .where(eq(electricityTariffs.id, tariffId))
      .limit(1);

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating tariff:', error);
    return NextResponse.json({ error: 'Failed to update tariff' }, { status: 500 });
  }
}
