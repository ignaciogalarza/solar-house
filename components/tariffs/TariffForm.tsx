'use client';

import { useState, useEffect } from 'react';

/**
 * =============================================================================
 * TYPE DEFINITIONS
 * =============================================================================
 */

/**
 * Represents a single tariff period (day, night, peak, ev)
 * These periods define different pricing rates for different times of day
 */
interface TariffPeriod {
  name: string;           // Period identifier: 'day', 'night', 'peak', 'ev'
  rate: number;           // Rate in €/kWh (e.g., 0.4383)
  startTime: string;      // Start time in 'HH:MM' format (e.g., '08:00')
  endTime: string;        // End time in 'HH:MM' format (e.g., '23:00')
  color: string;          // Hex color for UI visualization (e.g., '#F59E0B')
  daysOfWeek?: number[];  // Optional: days when period applies [0=Sun, 6=Sat]
}

/**
 * Complete tariff data structure from the database
 * Matches the schema from electricityTariffs table
 */
interface Tariff {
  id: number;
  providerName: string;
  tariffName: string;
  tariffType: 'single' | 'day_night' | 'day_night_peak' | 'day_night_peak_ev';
  isCurrent: boolean;
  exportRate: number;
  standingCharge: number;
  validFrom: string;       // ISO date string 'YYYY-MM-DD'
  validTo?: string;        // ISO date string 'YYYY-MM-DD' or null
  periods: TariffPeriod[]; // Associated time-based pricing periods
}

/**
 * Form data structure for creating/editing tariffs
 * Similar to Tariff but with optional fields for editing
 */
interface TariffFormData {
  providerName: string;
  tariffName: string;
  tariffType: 'single' | 'day_night' | 'day_night_peak' | 'day_night_peak_ev';
  exportRate: number;
  standingCharge: number;
  validFrom: string;
  validTo?: string;
  periods: TariffPeriod[];
}

/**
 * Component props interface
 */
interface TariffFormProps {
  initialData?: Tariff;  // When editing, provide existing tariff data
  onSave: (data: TariffFormData) => Promise<void>;  // Callback when form is saved
  onCancel?: () => void; // Optional callback when form is cancelled
}

/**
 * =============================================================================
 * CONSTANTS AND CONFIGURATION
 * =============================================================================
 */

/**
 * Color mappings for different tariff period types
 * These colors are used in the UI to visually distinguish periods
 */
const PERIOD_COLORS: Record<string, string> = {
  day: '#F59E0B',      // Amber - represents daytime
  night: '#3B82F6',    // Blue - represents nighttime
  peak: '#EF4444',     // Red - represents peak/expensive hours
  ev: '#10B981',       // Green - represents EV charging hours
};

/**
 * Default time periods for each tariff type
 * These provide sensible defaults when a tariff type is selected
 * Users can customize these times after selection
 */
const DEFAULT_PERIODS: Record<TariffFormData['tariffType'], TariffPeriod[]> = {
  // Single rate: one constant price 24/7
  single: [
    { 
      name: 'day', 
      rate: 0.35, 
      startTime: '00:00', 
      endTime: '23:59', 
      color: PERIOD_COLORS.day 
    },
  ],
  
  // Day/Night: two rates (typical Irish setup)
  // Night rate typically runs 23:00-08:00 (9 hours)
  // Day rate covers the remaining 15 hours
  day_night: [
    { 
      name: 'day', 
      rate: 0.44, 
      startTime: '08:00', 
      endTime: '23:00', 
      color: PERIOD_COLORS.day 
    },
    { 
      name: 'night', 
      rate: 0.23, 
      startTime: '23:00', 
      endTime: '08:00', 
      color: PERIOD_COLORS.night 
    },
  ],
  
  // Day/Night/Peak: adds peak hours during high demand
  // Peak hours typically 17:00-19:00 (evening peak demand)
  day_night_peak: [
    { 
      name: 'day', 
      rate: 0.42, 
      startTime: '08:00', 
      endTime: '17:00', 
      color: PERIOD_COLORS.day 
    },
    { 
      name: 'peak', 
      rate: 0.55, 
      startTime: '17:00', 
      endTime: '19:00', 
      color: PERIOD_COLORS.peak 
    },
    { 
      name: 'day', 
      rate: 0.42, 
      startTime: '19:00', 
      endTime: '23:00', 
      color: PERIOD_COLORS.day 
    },
    { 
      name: 'night', 
      rate: 0.23, 
      startTime: '23:00', 
      endTime: '08:00', 
      color: PERIOD_COLORS.night 
    },
  ],
  
  // Day/Night/Peak/EV: adds ultra-cheap EV charging period
  // EV hours typically 02:00-06:00 (cheapest overnight hours)
  day_night_peak_ev: [
    { 
      name: 'night', 
      rate: 0.23, 
      startTime: '23:00', 
      endTime: '02:00', 
      color: PERIOD_COLORS.night 
    },
    { 
      name: 'ev', 
      rate: 0.12, 
      startTime: '02:00', 
      endTime: '06:00', 
      color: PERIOD_COLORS.ev 
    },
    { 
      name: 'night', 
      rate: 0.23, 
      startTime: '06:00', 
      endTime: '08:00', 
      color: PERIOD_COLORS.night 
    },
    { 
      name: 'day', 
      rate: 0.42, 
      startTime: '08:00', 
      endTime: '17:00', 
      color: PERIOD_COLORS.day 
    },
    { 
      name: 'peak', 
      rate: 0.55, 
      startTime: '17:00', 
      endTime: '19:00', 
      color: PERIOD_COLORS.peak 
    },
    { 
      name: 'day', 
      rate: 0.42, 
      startTime: '19:00', 
      endTime: '23:00', 
      color: PERIOD_COLORS.day 
    },
  ],
};

/**
 * Human-readable labels for tariff types
 * Used in the radio button UI
 */
const TARIFF_TYPE_LABELS: Record<TariffFormData['tariffType'], { title: string; description: string }> = {
  single: {
    title: 'Single Rate',
    description: 'Same rate 24/7',
  },
  day_night: {
    title: 'Day/Night',
    description: '2 rates: Day & Night',
  },
  day_night_peak: {
    title: 'Day/Night/Peak',
    description: '3 rates: Day, Night & Peak',
  },
  day_night_peak_ev: {
    title: 'Day/Night/Peak/EV',
    description: '4 rates: includes EV overnight',
  },
};

/**
 * =============================================================================
 * MAIN COMPONENT
 * =============================================================================
 */

export default function TariffForm({ initialData, onSave, onCancel }: TariffFormProps) {
  /**
   * ---------------------------------------------------------------------------
   * STATE MANAGEMENT
   * ---------------------------------------------------------------------------
   */
  
  // Form field states - initialized from initialData or with sensible defaults
  const [providerName, setProviderName] = useState(initialData?.providerName || '');
  const [tariffName, setTariffName] = useState(initialData?.tariffName || '');
  const [tariffType, setTariffType] = useState<TariffFormData['tariffType']>(
    initialData?.tariffType || 'day_night'
  );
  const [exportRate, setExportRate] = useState(initialData?.exportRate || 0.10);
  const [standingCharge, setStandingCharge] = useState(initialData?.standingCharge || 0.70);
  const [validFrom, setValidFrom] = useState(initialData?.validFrom || '');
  const [validTo, setValidTo] = useState(initialData?.validTo || '');
  
  /**
   * Periods state manages the dynamic rate periods
   * This updates whenever tariffType changes or user edits individual periods
   */
  const [periods, setPeriods] = useState<TariffPeriod[]>(
    initialData?.periods || DEFAULT_PERIODS.day_night
  );

  // Loading state for async save operation
  const [isLoading, setIsLoading] = useState(false);

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * ---------------------------------------------------------------------------
   * EFFECTS
   * ---------------------------------------------------------------------------
   */

  /**
   * Effect: Update periods when tariff type changes
   * 
   * When the user selects a different tariff type, we need to:
   * 1. Load the appropriate default periods for that type
   * 2. Preserve any custom rates the user may have set
   * 
   * This only triggers on user selection, not on initial mount
   */
  useEffect(() => {
    // Skip on initial mount - we already have initialData or defaults
    if (initialData?.tariffType === tariffType) return;

    // Get default periods for the newly selected type
    const newPeriods = DEFAULT_PERIODS[tariffType];
    
    // Update state with new period structure
    setPeriods(newPeriods);
  }, [tariffType]); // Dependency: only run when tariffType changes

  /**
   * ---------------------------------------------------------------------------
   * VALIDATION
   * ---------------------------------------------------------------------------
   */

  /**
   * Validates all form fields before submission
   * 
   * Validation rules:
   * - Provider and tariff names are required
   * - Valid from date is required
   * - Export rate and standing charge must be >= 0
   * - Each period must have valid rate and times
   * - Time format must be HH:MM
   * 
   * @returns {boolean} true if form is valid, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required text fields
    if (!providerName.trim()) {
      newErrors.providerName = 'Provider name is required';
    }
    if (!tariffName.trim()) {
      newErrors.tariffName = 'Tariff name is required';
    }
    if (!validFrom) {
      newErrors.validFrom = 'Valid from date is required';
    }

    // Numeric validations
    if (exportRate < 0) {
      newErrors.exportRate = 'Export rate cannot be negative';
    }
    if (standingCharge < 0) {
      newErrors.standingCharge = 'Standing charge cannot be negative';
    }

    // Date range validation: validTo must be after validFrom
    if (validFrom && validTo && validTo < validFrom) {
      newErrors.validTo = 'End date must be after start date';
    }

    // Period validations
    periods.forEach((period, index) => {
      if (period.rate < 0) {
        newErrors[`period_${index}_rate`] = 'Rate cannot be negative';
      }
      
      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(period.startTime)) {
        newErrors[`period_${index}_start`] = 'Invalid time format';
      }
      if (!timeRegex.test(period.endTime)) {
        newErrors[`period_${index}_end`] = 'Invalid time format';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * ---------------------------------------------------------------------------
   * EVENT HANDLERS
   * ---------------------------------------------------------------------------
   */

  /**
   * Handles form submission
   * 
   * Process:
   * 1. Validate all form fields
   * 2. Prepare form data object
   * 3. Call onSave callback (parent handles API call)
   * 4. Handle loading states and errors
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission

    // Validate form before proceeding
    if (!validateForm()) {
      return; // Stop if validation fails
    }

    // Prepare the data object for submission
    const formData: TariffFormData = {
      providerName: providerName.trim(),
      tariffName: tariffName.trim(),
      tariffType,
      exportRate,
      standingCharge,
      validFrom,
      validTo: validTo || undefined, // Send undefined if empty (not null)
      periods,
    };

    // Execute save operation
    try {
      setIsLoading(true);
      await onSave(formData); // Parent component handles actual API call
      // Note: Parent component is responsible for navigation after save
    } catch (error) {
      console.error('Error saving tariff:', error);
      // In a production app, you'd want to show a toast/notification here
      setErrors({ submit: 'Failed to save tariff. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Updates a specific period's field
   * 
   * This creates a new array with the updated period to maintain immutability
   * 
   * @param index - Index of the period to update
   * @param field - Field name to update ('rate', 'startTime', or 'endTime')
   * @param value - New value for the field
   */
  const updatePeriod = (
    index: number, 
    field: keyof TariffPeriod, 
    value: string | number
  ) => {
    // Create a new periods array with the updated period
    const newPeriods = [...periods];
    newPeriods[index] = {
      ...newPeriods[index],
      [field]: value,
    };
    setPeriods(newPeriods);
  };

  /**
   * ---------------------------------------------------------------------------
   * HELPER FUNCTIONS
   * ---------------------------------------------------------------------------
   */

  /**
   * Calculates the width percentage for a time period in the 24-hour preview
   * 
   * Handles periods that span midnight (e.g., 23:00 to 08:00)
   * 
   * @param startTime - Start time in HH:MM format
   * @param endTime - End time in HH:MM format
   * @returns Width as a percentage (0-100)
   */
  const calculatePeriodWidth = (startTime: string, endTime: string): number => {
    // Convert HH:MM to minutes since midnight
    const parseTime = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const start = parseTime(startTime);
    let end = parseTime(endTime);

    // Handle periods that wrap around midnight
    // If end is before start, it means it continues into the next day
    if (end <= start) {
      end += 24 * 60; // Add 24 hours worth of minutes
    }

    const duration = end - start;
    const totalMinutes = 24 * 60; // Total minutes in a day
    
    return (duration / totalMinutes) * 100;
  };

  /**
   * Calculates the left offset percentage for a time period in the 24-hour preview
   * 
   * @param startTime - Start time in HH:MM format
   * @returns Offset as a percentage (0-100)
   */
  const calculatePeriodOffset = (startTime: string): number => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const dayMinutes = 24 * 60;
    
    return (totalMinutes / dayMinutes) * 100;
  };

  /**
   * ---------------------------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------------------------
   */

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto px-4 py-4">
      
      {/* 
        =======================================================================
        SECTION: Provider & Tariff Name
        =======================================================================
        Basic identification fields for the tariff
      */}
      <div className="space-y-4">
        {/* Provider Name Input */}
        <div>
          <label className="block text-sm font-medium text-[#94A3B8] mb-2">
            Provider Name
          </label>
          <input
            type="text"
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl bg-[#0F172A] border ${
              errors.providerName ? 'border-red-500' : 'border-[#334155]'
            } text-[#F8FAFC] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20 transition-colors`}
            placeholder="e.g., Electric Ireland"
          />
          {errors.providerName && (
            <p className="mt-1 text-sm text-red-500">{errors.providerName}</p>
          )}
        </div>

        {/* Tariff Name Input */}
        <div>
          <label className="block text-sm font-medium text-[#94A3B8] mb-2">
            Tariff Name
          </label>
          <input
            type="text"
            value={tariffName}
            onChange={(e) => setTariffName(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl bg-[#0F172A] border ${
              errors.tariffName ? 'border-red-500' : 'border-[#334155]'
            } text-[#F8FAFC] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20 transition-colors`}
            placeholder="e.g., Home Electric+"
          />
          {errors.tariffName && (
            <p className="mt-1 text-sm text-red-500">{errors.tariffName}</p>
          )}
        </div>
      </div>

      {/* 
        =======================================================================
        SECTION: Tariff Type Selection
        =======================================================================
        Radio buttons to select the tariff structure
        Changes here will update the periods section dynamically
      */}
      <div className="bg-[#1E293B] rounded-2xl p-4">
        <label className="block text-sm font-medium text-[#94A3B8] mb-3">
          Tariff Type
        </label>

        <div className="space-y-2">
          {(Object.keys(TARIFF_TYPE_LABELS) as TariffFormData['tariffType'][]).map((type) => (
            <label
              key={type}
              className={`flex items-center gap-3 p-3 bg-[#0F172A] rounded-xl cursor-pointer border-2 transition-colors ${
                tariffType === type
                  ? 'border-[#F59E0B]'
                  : 'border-transparent hover:border-[#334155]'
              }`}
            >
              <input
                type="radio"
                name="tariff_type"
                value={type}
                checked={tariffType === type}
                onChange={(e) => setTariffType(e.target.value as TariffFormData['tariffType'])}
                className="w-4 h-4 text-[#F59E0B] accent-[#F59E0B]"
              />
              <div>
                <div className="font-medium text-[#F8FAFC]">
                  {TARIFF_TYPE_LABELS[type].title}
                </div>
                <div className="text-xs text-[#94A3B8]">
                  {TARIFF_TYPE_LABELS[type].description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 
        =======================================================================
        SECTION: Rate Periods
        =======================================================================
        Dynamic form fields for each pricing period
        Number and structure of periods depends on selected tariff type
      */}
      <div className="bg-[#1E293B] rounded-2xl p-4">
        <label className="block text-sm font-medium text-[#94A3B8] mb-3">
          Rate Periods
        </label>

        <div className="space-y-3">
          {periods.map((period, index) => (
            <div key={index} className="bg-[#0F172A] rounded-xl p-4">
              {/* Period Header: Shows period name, color indicator, and time range */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {/* Color indicator dot */}
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: period.color }}
                  />
                  {/* Period name (capitalized) */}
                  <span className="font-medium text-[#F8FAFC] capitalize">
                    {period.name}
                  </span>
                </div>
                {/* Time range display */}
                <span className="text-xs text-[#94A3B8]">
                  {period.startTime} - {period.endTime}
                </span>
              </div>

              {/* Period Input Fields: Rate and Time inputs */}
              <div className="grid grid-cols-[1fr_2fr] gap-3">
                {/* Rate Input */}
                <div>
                  <label className="text-xs text-[#94A3B8] mb-1 block">
                    Rate (€/kWh)
                  </label>
                  <input
                    type="number"
                    value={period.rate}
                    onChange={(e) => updatePeriod(index, 'rate', parseFloat(e.target.value) || 0)}
                    step="0.0001"
                    min="0"
                    className={`w-full px-3 py-2 rounded-lg bg-[#1E293B] border ${
                      errors[`period_${index}_rate`] ? 'border-red-500' : 'border-[#334155]'
                    } text-[#F8FAFC] text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20`}
                  />
                  {errors[`period_${index}_rate`] && (
                    <p className="mt-1 text-xs text-red-500">{errors[`period_${index}_rate`]}</p>
                  )}
                </div>

                {/* Time Range Inputs */}
                <div>
                  <label className="text-xs text-[#94A3B8] mb-1 block">
                    Hours
                  </label>
                  <div className="flex gap-1 items-center">
                    {/* Start Time */}
                    <input
                      type="time"
                      value={period.startTime}
                      onChange={(e) => updatePeriod(index, 'startTime', e.target.value)}
                      className={`flex-1 min-w-0 px-2 py-2 rounded-lg bg-[#1E293B] border ${
                        errors[`period_${index}_start`] ? 'border-red-500' : 'border-[#334155]'
                      } text-[#F8FAFC] text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20`}
                    />
                    {/* Separator */}
                    <span className="text-[#94A3B8] flex-shrink-0">-</span>
                    {/* End Time */}
                    <input
                      type="time"
                      value={period.endTime}
                      onChange={(e) => updatePeriod(index, 'endTime', e.target.value)}
                      className={`flex-1 min-w-0 px-2 py-2 rounded-lg bg-[#1E293B] border ${
                        errors[`period_${index}_end`] ? 'border-red-500' : 'border-[#334155]'
                      } text-[#F8FAFC] text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20`}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 
        =======================================================================
        SECTION: 24-Hour Visual Preview
        =======================================================================
        Visual representation of the tariff periods across a 24-hour day
        Helps users understand the time distribution of different rates
      */}
      <div className="bg-[#1E293B] rounded-2xl p-4">
        <label className="block text-sm font-medium text-[#94A3B8] mb-3">
          24-Hour Preview
        </label>

        {/* Timeline bar showing all periods */}
        <div className="relative h-10 rounded-lg overflow-hidden flex">
          {periods.map((period, index) => {
            const width = calculatePeriodWidth(period.startTime, period.endTime);
            
            return (
              <div
                key={index}
                className="h-full flex items-center justify-center text-xs font-medium text-white"
                style={{
                  width: `${width}%`,
                  backgroundColor: `${period.color}99`, // 99 = 60% opacity in hex
                }}
              >
                {/* Only show text if period is wide enough */}
                {width > 10 && (
                  <span className="capitalize">
                    {period.name} €{period.rate.toFixed(2)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Time labels (0, 6, 12, 18, 24 hours) */}
        <div className="flex justify-between mt-2 text-xs text-[#94A3B8]">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>

      {/* 
        =======================================================================
        SECTION: Export Rate
        =======================================================================
        Rate paid for exporting excess solar to the grid
      */}
      <div className="bg-[#1E293B] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          {/* Green dot indicator for export */}
          <div className="w-3 h-3 rounded-full bg-[#10B981]" />
          <label className="text-sm font-medium text-[#94A3B8]">
            Export Rate
          </label>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="number"
              value={exportRate}
              onChange={(e) => setExportRate(parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0"
              className={`w-full px-4 py-3 rounded-xl bg-[#0F172A] border ${
                errors.exportRate ? 'border-red-500' : 'border-[#334155]'
              } text-[#F8FAFC] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20`}
            />
          </div>
          <span className="text-[#94A3B8]">€/kWh</span>
        </div>

        <p className="text-xs text-[#94A3B8] mt-2">
          Rate paid for electricity exported to the grid
        </p>

        {errors.exportRate && (
          <p className="mt-1 text-sm text-red-500">{errors.exportRate}</p>
        )}
      </div>

      {/* 
        =======================================================================
        SECTION: Standing Charge
        =======================================================================
        Fixed daily charge regardless of consumption
      */}
      <div className="bg-[#1E293B] rounded-2xl p-4">
        <label className="block text-sm font-medium text-[#94A3B8] mb-3">
          Fixed Charges
        </label>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-[#94A3B8] mb-1 block">
              Standing Charge
            </label>
            <input
              type="number"
              value={standingCharge}
              onChange={(e) => setStandingCharge(parseFloat(e.target.value) || 0)}
              step="0.0001"
              min="0"
              className={`w-full px-3 py-2 rounded-lg bg-[#0F172A] border ${
                errors.standingCharge ? 'border-red-500' : 'border-[#334155]'
              } text-[#F8FAFC] text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20`}
            />
          </div>
          <span className="text-[#94A3B8] text-sm mt-5">€/day</span>
        </div>

        {errors.standingCharge && (
          <p className="mt-1 text-sm text-red-500">{errors.standingCharge}</p>
        )}
      </div>

      {/* 
        =======================================================================
        SECTION: Valid Period
        =======================================================================
        Date range when this tariff is/was active
        validTo is optional - leave empty for current tariff
      */}
      <div className="bg-[#1E293B] rounded-2xl p-4">
        <label className="block text-sm font-medium text-[#94A3B8] mb-3">
          Valid Period
        </label>

        <div className="grid grid-cols-2 gap-3">
          {/* Valid From Date */}
          <div>
            <label className="text-xs text-[#94A3B8] mb-1 block">From</label>
            <input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg bg-[#0F172A] border ${
                errors.validFrom ? 'border-red-500' : 'border-[#334155]'
              } text-[#F8FAFC] text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20`}
            />
            {errors.validFrom && (
              <p className="mt-1 text-xs text-red-500">{errors.validFrom}</p>
            )}
          </div>

          {/* Valid To Date (Optional) */}
          <div>
            <label className="text-xs text-[#94A3B8] mb-1 block">
              To (optional)
            </label>
            <input
              type="date"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg bg-[#0F172A] border ${
                errors.validTo ? 'border-red-500' : 'border-[#334155]'
              } text-[#F8FAFC] text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20`}
            />
            {errors.validTo && (
              <p className="mt-1 text-xs text-red-500">{errors.validTo}</p>
            )}
          </div>
        </div>

        <p className="text-xs text-[#94A3B8] mt-2">
          Leave 'To' empty if this is your current tariff
        </p>
      </div>

      {/* 
        =======================================================================
        SECTION: Form Actions
        =======================================================================
        Save and Cancel buttons
      */}
      <div className="flex gap-3">
        {/* Cancel Button - only show if onCancel callback provided */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-4 rounded-xl border border-[#334155] text-[#F8FAFC] font-semibold hover:bg-[#1E293B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}

        {/* Save Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-[#F59E0B] text-[#0F172A] font-semibold py-4 rounded-xl hover:bg-[#F59E0B]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save Tariff'}
        </button>
      </div>

      {/* Global form error message */}
      {errors.submit && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
          <p className="text-sm text-red-500">{errors.submit}</p>
        </div>
      )}
    </form>
  );
}
