import { NextResponse } from "next/server";

/**
 * GET /api/energy/current
 *
 * Returns current real-time energy status.
 * For development, returns mock data if MyEnergi env vars are not set.
 */
export async function GET() {
  // Check if we have MyEnergi credentials
  const hasCredentials =
    process.env.MYENERGI_SERIAL && process.env.MYENERGI_API_KEY;

  if (hasCredentials) {
    // Use real API
    try {
      const { getEnergyService } = await import("@/lib/services/energy");
      const service = getEnergyService();
      const status = await service.getCurrentStatus();

      return NextResponse.json({
        success: true,
        data: {
          solarW: status.solarGenerationW,
          gridW: status.gridW,
          consumptionW: status.consumptionW,
          evChargingW: status.evChargingW,
          hotWaterW: status.hotWaterDiversionW,
          zappiStatus: status.zappiStatus,
          eddiStatus: status.eddiStatus,
          timestamp: status.timestamp.toISOString(),
        },
      });
    } catch (error) {
      console.error("Energy API error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch energy data" },
        { status: 500 }
      );
    }
  }

  // Return mock data for development
  return NextResponse.json({
    success: true,
    data: {
      solarW: 4200,
      gridW: -2400, // negative = exporting
      consumptionW: 1800,
      evChargingW: 0,
      hotWaterW: 300,
      zappiStatus: "Eco+ - No vehicle",
      eddiStatus: "Diverting",
      eddiTempC: 52,
      timestamp: new Date().toISOString(),
    },
    mock: true,
  });
}
