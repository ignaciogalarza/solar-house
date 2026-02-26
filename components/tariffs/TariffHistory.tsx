"use client";

/**
 * TariffHistory Component
 *
 * Displays a list of electricity tariffs with their validity periods.
 * Shows the current active tariff with a green "Active" badge and allows
 * users to select/edit past tariffs through a clickable row interface.
 *
 * Features:
 * - Current tariff highlighted with green "Active" badge
 * - Provider name and tariff name display
 * - Validity date range (validFrom - validTo)
 * - ChevronRight icon indicating clickability
 * - Hover effects for better UX
 */

import { ChevronRight } from "lucide-react";

/**
 * Props interface for the TariffHistory component
 *
 * @property tariffs - Array of tariff objects with id, provider, name, dates, and current status
 * @property onSelect - Callback function triggered when a tariff row is clicked
 */
interface TariffHistoryProps {
  tariffs: Array<{
    id: number;
    providerName: string;
    tariffName: string;
    validFrom: string;
    validTo?: string;
    isCurrent: boolean;
  }>;
  onSelect: (id: number) => void;
}

/**
 * Helper function to format date strings into a readable format
 * Converts ISO date strings (YYYY-MM-DD) to DD/MM/YYYY format
 *
 * @param dateString - Date in YYYY-MM-DD format or other ISO format
 * @returns Formatted date string or the original if parsing fails
 *
 * Example: "2024-02-26" becomes "26/02/2024"
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    // Format: DD/MM/YYYY
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    // Return original string if date parsing fails
    return dateString;
  }
}

/**
 * Helper function to generate a date range string for display
 *
 * @param validFrom - Start date of tariff validity
 * @param validTo - End date of tariff validity (optional)
 * @returns Formatted date range string
 *
 * Examples:
 * - With end date: "26/02/2024 - 31/03/2024"
 * - No end date (current): "26/02/2024 - Present"
 */
function getDateRange(validFrom: string, validTo?: string): string {
  const fromDate = formatDate(validFrom);

  // If no end date, show "Present" to indicate ongoing/current tariff
  if (!validTo) {
    return `${fromDate} - Present`;
  }

  const toDate = formatDate(validTo);
  return `${fromDate} - ${toDate}`;
}

/**
 * Main component: Renders a list of tariffs with current tariff highlighted
 *
 * Layout:
 * - Container with dark background matching mockup design
 * - Each tariff row with provider, name, dates, and action icon
 * - Active badge for current tariff
 * - Clickable rows with hover effects
 */
export function TariffHistory({ tariffs, onSelect }: TariffHistoryProps) {
  // Handle empty state
  if (!tariffs || tariffs.length === 0) {
    return (
      <div className="bg-[#1E293B] rounded-2xl p-4">
        <p className="text-[#94A3B8] text-center py-8">
          No tariffs available
        </p>
      </div>
    );
  }

  return (
    // Outer container: dark blue background with rounded corners and padding
    // bg-[#1E293B] = slate-900, rounded-2xl = 1rem border radius
    <div className="bg-[#1E293B] rounded-2xl p-4">
      {/* List container: flex column with gap between items */}
      <div className="space-y-3">
        {tariffs.map((tariff) => (
          // Tariff row: clickable item with provider and tariff info
          <button
            key={tariff.id}
            onClick={() => onSelect(tariff.id)}
            // Background, padding, rounded corners, and border styling
            // bg-[#0F172A] = slate-950, rounded-xl = 0.75rem border radius
            className="w-full bg-[#0F172A] rounded-xl p-3 text-left transition-all duration-200 hover:bg-[#1E293B] active:scale-95 border border-white/5"
            // Accessible button with proper semantics
            aria-label={`Select ${tariff.tariffName} tariff from ${tariff.providerName}`}
          >
            {/* Content container: flex row with space between main content and icon */}
            <div className="flex items-center justify-between gap-3">
              {/* Left section: provider and tariff info */}
              <div className="flex-1 min-w-0">
                {/* Provider name and tariff name on same line */}
                {/* flex items-baseline = align text baseline, gap ensures spacing */}
                <div className="flex items-baseline gap-2 mb-1">
                  {/* Provider name: primary color, can truncate if too long */}
                  <span className="text-sm font-medium text-[#F8FAFC] truncate">
                    {tariff.providerName}
                  </span>

                  {/* Tariff name: secondary color, can truncate if too long */}
                  <span className="text-sm text-[#94A3B8] truncate">
                    {tariff.tariffName}
                  </span>

                  {/* Active badge: green badge shown only for current tariff */}
                  {/* Positioned inline with provider and name */}
                  {tariff.isCurrent && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 flex-shrink-0">
                      Active
                    </span>
                  )}
                </div>

                {/* Date range: secondary color below the provider/name line */}
                {/* Shows validity period with "Present" for ongoing tariffs */}
                <p className="text-xs text-[#64748B]">
                  {getDateRange(tariff.validFrom, tariff.validTo)}
                </p>
              </div>

              {/* Right section: chevron icon indicating clickability */}
              {/* flex-shrink-0 prevents icon from being squeezed if content is long */}
              <div className="flex-shrink-0 text-[#64748B] group-hover:text-[#F8FAFC] transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
