'use client';

import { useEffect, useState } from 'react';
import { TariffForm } from '@/components/tariffs';

/**
 * =============================================================================
 * TYPE DEFINITIONS
 * =============================================================================
 * Defines the shape of data structures used throughout this page
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
  psoLevy?: number;        // Monthly PSO levy in EUR
  vatRate?: number;        // VAT percentage (e.g. 9 for 9%)
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
  psoLevy?: number;
  vatRate?: number;
  validFrom: string;
  validTo?: string;
  periods: TariffPeriod[];
}

/**
 * API response structure for tariff endpoints
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * =============================================================================
 * MAIN COMPONENT
 * =============================================================================
 */

export default function TariffsPage() {
  /**
   * ---------------------------------------------------------------------------
   * STATE MANAGEMENT
   * ---------------------------------------------------------------------------
   * Tracks the page state including tariff data and UI interaction states
   */

  // Array of all tariffs fetched from the API
  const [tariffs, setTariffs] = useState<Tariff[]>([]);

  // The currently selected tariff for editing (null = create new)
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);

  // Loading state for initial data fetch
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Loading state for save operation (POST/PUT)
  const [isSaving, setIsSaving] = useState(false);

  // Error message to display to user
  const [error, setError] = useState<string | null>(null);

  /**
   * ---------------------------------------------------------------------------
   * EFFECTS
   * ---------------------------------------------------------------------------
   * Handle side effects like data fetching on page load
   */

  /**
   * Effect: Fetch tariffs on page load
   * 
   * This runs once when the component mounts to load all existing tariffs
   * from the database. Used to populate the history list.
   */
  useEffect(() => {
    fetchTariffs();
  }, []);

  /**
   * ---------------------------------------------------------------------------
   * DATA FETCHING
   * ---------------------------------------------------------------------------
   * Functions to fetch data from the API
   */

  /**
   * Fetches all tariffs from the API
   * 
   * Called on page load to populate the tariff history list.
   * Updates component state with the fetched data.
   * 
   * Process:
   * 1. Set loading state to indicate data is being fetched
   * 2. Make GET request to /api/tariffs endpoint
   * 3. Parse JSON response
   * 4. Check if response was successful
   * 5. Update tariffs state with fetched data
   * 6. Handle errors gracefully
   * 7. Always clear loading state when complete
   */
  const fetchTariffs = async () => {
    try {
      setIsLoadingData(true);
      setError(null);

      // Make API request to fetch all tariffs
      const response = await fetch('/api/tariffs');
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch tariffs');
      }
      const tariffs = await response.json();

      // Update state with fetched tariffs
      setTariffs(tariffs);
    } catch (err) {
      // Capture error message for display
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setTariffs([]);
    } finally {
      // Always clear loading state
      setIsLoadingData(false);
    }
  };

  /**
   * ---------------------------------------------------------------------------
   * EVENT HANDLERS
   * ---------------------------------------------------------------------------
   * Functions that handle user interactions
   */

  /**
   * Handles form submission (Save button clicked)
   * 
   * This is called from TariffForm component when the user submits the form.
   * It determines whether this is a create (POST) or update (PUT) operation
   * based on whether selectedTariff is set.
   * 
   * Process:
   * 1. Set saving state to show loading indicator
   * 2. Determine if this is create or update operation
   * 3. Make appropriate API request (POST for new, PUT for existing)
   * 4. Check API response for success
   * 5. Refresh tariffs list to show updated data
   * 6. Clear selected tariff to reset form
   * 7. Handle errors with user feedback
   * 
   * @param formData - Form data from TariffForm component
   */
  const handleSaveTariff = async (formData: TariffFormData) => {
    try {
      setIsSaving(true);
      setError(null);

      // Determine if this is a create or update operation
      const isUpdate = selectedTariff !== null;
      const method = isUpdate ? 'PUT' : 'POST';

      // Build request body - add isCurrent (true for new, preserve for updates)
      const body = {
        ...formData,
        isCurrent: isUpdate ? selectedTariff.isCurrent : true,
        ...(isUpdate && { id: selectedTariff.id }),
      };

      // Make API request to save the tariff
      const response = await fetch('/api/tariffs', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      // Check if API response was successful
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save tariff');
      }

      // Refresh the tariffs list to show the changes
      await fetchTariffs();

      // Clear the selected tariff to reset the form for creating new tariffs
      setSelectedTariff(null);
    } catch (err) {
      // Capture error message for display
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      // Always clear saving state
      setIsSaving(false);
    }
  };

  /**
   * Handles selection of a tariff from the history list
   *
   * Fetches the full tariff with periods from the API before loading
   * into the form for editing.
   *
   * @param tariff - The tariff to load into the form
   */
  const handleSelectTariff = async (tariff: Tariff) => {
    try {
      setError(null);
      // Fetch full tariff with periods
      const response = await fetch(`/api/tariffs?id=${tariff.id}`);
      if (!response.ok) {
        throw new Error('Failed to load tariff');
      }
      const fullTariff = await response.json();
      setSelectedTariff(fullTariff);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tariff');
    }
  };

  /**
   * Handles form cancellation
   * 
   * When user clicks Cancel button in the form, this clears the selected
   * tariff and resets the form back to create mode.
   */
  const handleCancelEdit = () => {
    setSelectedTariff(null);
    setError(null);
  };

  /**
   * Handles tariff deletion
   */
  const handleDeleteTariff = async (id: number) => {
    if (!confirm('Delete this tariff?')) return;
    try {
      const response = await fetch(`/api/tariffs?id=${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to delete');
      }
      if (selectedTariff?.id === id) setSelectedTariff(null);
      await fetchTariffs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  /**
   * ---------------------------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------------------------
   * JSX structure and layout for the page
   */

  return (
    <div className="px-4 py-4 space-y-4">
      {/* 
        =======================================================================
        LOADING STATE
        =======================================================================
        Shows skeleton loaders while fetching initial data from API
      */}
      {isLoadingData ? (
        <div className="space-y-4">
          {/* Form skeleton */}
          <div className="bg-[#1E293B] rounded-2xl p-5 h-[400px] animate-pulse" />
          {/* History list skeleton */}
          <div className="space-y-3">
            <div className="bg-[#1E293B] rounded-2xl p-5 h-24 animate-pulse" />
            <div className="bg-[#1E293B] rounded-2xl p-5 h-24 animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          {/* 
            =======================================================================
            ERROR MESSAGE
            =======================================================================
            Displays error notification if something went wrong with API calls
          */}
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-2xl p-5 text-red-200">
              <p className="text-sm font-medium">Error: {error}</p>
            </div>
          )}

          {/* 
            =======================================================================
            TARIFF FORM SECTION
            =======================================================================
            TariffForm component for creating new or editing existing tariffs
            
            Positioned at the top of the page for easy access
            - If selectedTariff is null: shows form for creating new tariff
            - If selectedTariff is set: shows form pre-populated with that tariff's data
            
            Props:
            - initialData: Optional tariff to edit (undefined = create mode)
            - onSave: Callback when user submits form (we handle API call)
            - onCancel: Callback when user clicks cancel (clear selection)
          */}
          <div className="bg-[#1E293B] rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">
              {selectedTariff ? 'Edit Tariff' : 'Create New Tariff'}
            </h2>
            <TariffForm
              initialData={selectedTariff || undefined}
              onSave={handleSaveTariff}
              onCancel={selectedTariff ? handleCancelEdit : undefined}
            />
          </div>

          {/* 
            =======================================================================
            TARIFF HISTORY SECTION
            =======================================================================
            List of all tariffs from the database
            
            Users can:
            - Click a tariff to load it into the form for editing
            - View details like provider, rates, and valid period
            - See which tariff is currently active (isCurrent = true)
            
            List is always displayed below the form for reference
          */}
          {tariffs.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-[#94A3B8]">Tariff History</h2>

              {tariffs.map((tariff) => (
                <div
                  key={tariff.id}
                  onClick={() => handleSelectTariff(tariff)}
                  className={`w-full text-left bg-[#1E293B] rounded-2xl p-4 transition-colors border-2 cursor-pointer ${
                    selectedTariff?.id === tariff.id
                      ? 'border-[#F59E0B]'
                      : 'border-transparent hover:border-[#334155]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Provider and Tariff Name */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#F8FAFC] truncate">
                          {tariff.providerName}
                        </h3>
                        {/* Current tariff indicator */}
                        {tariff.isCurrent && (
                          <span className="px-2 py-1 bg-[#F59E0B] text-[#0F172A] text-xs font-semibold rounded-full whitespace-nowrap">
                            Current
                          </span>
                        )}
                      </div>

                      {/* Tariff name and type */}
                      <p className="text-sm text-[#94A3B8] mb-2">
                        {tariff.tariffName} ({tariff.tariffType.replace(/_/g, '/')})
                      </p>

                      {/* Rates summary */}
                      <div className="flex gap-4 text-xs text-[#94A3B8] mb-2">
                        <span>Export: €{tariff.exportRate.toFixed(2)}/kWh</span>
                        <span>Standing: €{tariff.standingCharge.toFixed(2)}/day</span>
                      </div>

                      {/* Valid period */}
                      <p className="text-xs text-[#64748B]">
                        Valid: {tariff.validFrom}
                        {tariff.validTo && ` to ${tariff.validTo}`}
                      </p>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTariff(tariff.id);
                      }}
                      className="ml-2 p-2 text-[#94A3B8] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      aria-label="Delete tariff"
                    >
                      <span className="text-xl font-bold">−</span>
                    </button>

                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 
            =======================================================================
            EMPTY STATE
            =======================================================================
            Show message when no tariffs exist yet
          */}
          {tariffs.length === 0 && !error && (
            <div className="bg-[#1E293B] rounded-2xl p-8 text-center">
              <p className="text-[#94A3B8]">
                No tariffs yet. Create your first tariff above to get started.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
