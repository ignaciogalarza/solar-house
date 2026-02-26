"use client";

/**
 * RatePreview Component
 *
 * Displays a 24-hour timeline bar showing electricity rate periods visually.
 * Each rate period is represented as a colored segment proportional to its duration.
 * Handles edge cases like overnight periods that wrap around midnight.
 */

interface RatePeriod {
  name: string;
  rate: number;
  startTime: string; // 'HH:MM' format (e.g., '22:00')
  endTime: string; // 'HH:MM' format (e.g., '06:00')
  color: string; // Hex color code (e.g., '#3B82F6')
}

interface RatePreviewProps {
  periods: RatePeriod[];
}

/**
 * Helper function to convert time string (HH:MM) to minutes since midnight.
 * This allows us to work with time as a simple numeric value.
 *
 * @param timeStr - Time in 'HH:MM' format
 * @returns Minutes since midnight (0-1440)
 *
 * Example: '14:30' becomes 870 minutes
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Helper function to calculate the duration of a rate period in minutes.
 * Handles overnight periods where end time is earlier than start time
 * (e.g., 23:00-08:00 spans across midnight).
 *
 * @param startTime - Period start time in 'HH:MM' format
 * @param endTime - Period end time in 'HH:MM' format
 * @returns Duration in minutes
 *
 * Example: '23:00' to '08:00' = (8*60) - (23*60) + (24*60) = 540 minutes
 */
function calculateDuration(startTime: string, endTime: string): number {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  // If end time is less than start time, it wraps around midnight
  if (endMinutes <= startMinutes) {
    // Total minutes in a day (24 * 60) minus start, plus end
    return 24 * 60 - startMinutes + endMinutes;
  }

  // Normal case: end is after start on the same day
  return endMinutes - startMinutes;
}

/**
 * Helper function to convert a time to a percentage of the 24-hour day.
 * This percentage is used to calculate the position/width of segments.
 *
 * @param timeStr - Time in 'HH:MM' format
 * @returns Percentage of 24 hours (0-100)
 *
 * Example: '12:00' (noon) = 50%, '18:00' (6 PM) = 75%
 */
function timeToPercentage(timeStr: string): number {
  const minutes = timeToMinutes(timeStr);
  return (minutes / (24 * 60)) * 100;
}

/**
 * Processes periods to create rendered segments, handling overnight wrapping.
 * If a period wraps around midnight, it's split into two visual segments:
 * - One at the end of the previous day
 * - One at the start of the next day
 *
 * @param periods - Array of rate periods
 * @returns Array of segments with start%, width%, and period data
 */
function processSegments(periods: RatePeriod[]) {
  const segments: Array<{
    startPercent: number;
    widthPercent: number;
    period: RatePeriod;
  }> = [];

  for (const period of periods) {
    const startPercent = timeToPercentage(period.startTime);
    const endPercent = timeToPercentage(period.endTime);
    const durationMinutes = calculateDuration(period.startTime, period.endTime);
    const widthPercent = (durationMinutes / (24 * 60)) * 100;

    // Check if this period wraps around midnight
    // This happens when endPercent <= startPercent
    if (endPercent <= startPercent) {
      // Split into two segments: one for evening, one for morning

      // Evening segment: from start time to midnight (24:00)
      const eveningWidth = 100 - startPercent;
      segments.push({
        startPercent,
        widthPercent: eveningWidth,
        period,
      });

      // Morning segment: from midnight (00:00) to end time
      segments.push({
        startPercent: 0,
        widthPercent: endPercent,
        period,
      });
    } else {
      // Normal case: period doesn't wrap, add as single segment
      segments.push({
        startPercent,
        widthPercent,
        period,
      });
    }
  }

  // Sort segments by start position for correct visual ordering
  return segments.sort((a, b) => a.startPercent - b.startPercent);
}

/**
 * Main component: Renders a 24-hour timeline visualization of electricity rates.
 * Includes colored segments for each rate period and a time axis below.
 */
export function RatePreview({ periods }: RatePreviewProps) {
  // Process periods to handle overnight wrapping
  const segments = processSegments(periods);

  return (
    <div className="space-y-3">
      {/* Timeline container: flex row with rounded corners and overflow hidden */}
      {/* h-10 = 40px height, rounded-lg = rounded corners, flex = flex display */}
      {/* overflow-hidden = prevents segments from extending beyond rounded corners */}
      <div className="h-10 rounded-lg overflow-hidden flex bg-[#1E293B] border border-white/5">
        {segments.map((segment, index) => (
          <div
            key={index}
            // Style each segment:
            // - width: percentage of 24-hour day
            // - left: positioned by CSS flexbox
            // - backgroundColor: from the rate period color
            // - display: flex + items center for text centering
            style={{
              width: `${segment.widthPercent}%`,
              backgroundColor: segment.period.color,
              minWidth: segment.widthPercent > 8 ? "auto" : "0",
            }}
            className="flex items-center justify-center transition-all duration-300 hover:opacity-80"
            // Tooltip on hover shows period name and rate
            title={`${segment.period.name}: EUR${segment.period.rate.toFixed(2)}/kWh`}
          >
            {/* Label text: only show if segment is wide enough (>8% width = ~2 hours) */}
            {segment.widthPercent > 8 && (
              <span className="text-xs font-semibold text-white text-center px-1">
                {segment.period.name}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Time axis: 5 markers for 00:00, 06:00, 12:00, 18:00, 24:00 */}
      {/* This provides temporal reference for the timeline above */}
      <div className="flex justify-between text-[10px] text-[#64748B] font-medium px-0.5">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>

      {/* Legend: displays rate information for each unique period */}
      {/* Helps users understand the rate structure and associated costs */}
      <div className="flex flex-wrap gap-2 text-xs">
        {periods.map((period) => (
          <div
            key={period.name}
            className="flex items-center gap-1.5 bg-[#0F172A] rounded-md px-2.5 py-1.5 border border-white/5"
          >
            {/* Color indicator dot */}
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: period.color }}
            />
            {/* Period name and rate */}
            <span className="text-[#F8FAFC]">
              {period.name} EUR{period.rate.toFixed(2)}/kWh
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
