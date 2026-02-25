import { NextResponse } from "next/server";

/**
 * GET /api/energy/today
 *
 * Returns today's energy totals (generated, consumed, exported, imported)
 */
export async function GET() {
  const hasCredentials =
    process.env.MYENERGI_SERIAL && process.env.MYENERGI_API_KEY;

  if (hasCredentials) {
    try {
      const { getEnergyService } = await import("@/lib/services/energy");
      const service = getEnergyService();
      const totals = await service.getDailyTotals();

      return NextResponse.json({
        success: true,
        data: totals,
      });
    } catch (error) {
      console.error("Energy today API error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch daily totals" },
        { status: 500 }
      );
    }
  }

  // Mock data for development
  return NextResponse.json({
    success: true,
    data: {
      generatedKwh: 18.4,
      consumedKwh: 12.1,
      exportedKwh: 8.2,
      importedKwh: 1.9,
      evChargedKwh: 0,
      hotWaterKwh: 3.2,
    },
    mock: true,
  });
}
