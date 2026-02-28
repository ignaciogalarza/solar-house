# Compare Page Implementation Plan

**Created**: 2026-02-28
**Mockup**: `mockups/04-compare.html`
**Status**: Planning

## Overview

Provider comparison page that calculates annual costs using historical energy data against multiple tariffs, showing potential savings.

## Architecture

```
/app/compare/page.tsx          → Page component (client)
/components/compare/           → UI components
/lib/utils/compareCalc.ts      → Comparison calculation logic
/app/api/compare/route.ts      → API endpoint for calculations
```

## Tasks

### Phase 1: Core Calculation Logic (Sonnet)
Complex business logic requiring careful implementation.

- [ ] **Task 1.1**: Create `lib/utils/compareCalc.ts`
  - `calculateTariffCost(readings, tariff, periods)` - matches readings to rate periods
  - `calculateExportRevenue(readings, exportRate)`
  - `calculateNetCost(importCost, exportRevenue, standingCharge, psoLevy, vatRate)`
  - Handle time-of-use matching (day/night/peak based on reading timestamp)
  - **Key logic**: For each reading, find applicable rate period by matching time and day-of-week

### Phase 2: API Endpoint (Haiku)
Straightforward data aggregation.

- [ ] **Task 2.1**: Create `app/api/compare/route.ts`
  - GET endpoint with query params: `startDate`, `endDate`
  - Returns: usage summary + cost calculations for all tariffs
  - Uses `compareCalc.ts` functions

### Phase 3: UI Components (Haiku)
Presentational components following existing patterns.

- [ ] **Task 3.1**: Create `components/compare/UsageSummary.tsx`
  - Grid showing imported/exported/generated kWh
  - Props: `{ imported: number, exported: number, generated: number }`

- [ ] **Task 3.2**: Create `components/compare/ProviderCard.tsx`
  - Shows provider name, tariff name, annual cost, export revenue, net cost
  - Variants: `current` (blue border), `best` (green border + badge), `worse` (dimmed)
  - Props: `{ provider, tariff, costs, isCurrent, isBest, savings, baseline }`

- [ ] **Task 3.3**: Create `components/compare/SavingsBar.tsx`
  - Progress bar showing relative savings
  - Green for savings, red for more expensive
  - Props: `{ savings: number, maxSavings: number }`

- [ ] **Task 3.4**: Create `components/compare/RateTable.tsx`
  - Comparison table with columns: Provider, Day, Night, Export
  - Props: `{ tariffs: TariffWithRates[] }`

### Phase 4: Page Assembly (Haiku)
Compose components into page.

- [ ] **Task 4.1**: Create `app/compare/page.tsx`
  - Period selector (reuse `PeriodSelector` component)
  - UsageSummary
  - ProviderCard list (sorted by net cost)
  - RateTable
  - "Add Provider" button (links to /tariffs)

### Phase 5: Navigation (Haiku)

- [ ] **Task 5.1**: Add Compare to bottom navigation
  - Update `components/navigation/BottomNav.tsx`
  - Add compare icon and route

## File Dependencies

**Read before implementing**:
- `lib/db/schema.ts` - tariff/reading schemas
- `components/tariffs/RatePreview.tsx` - time calculation helpers
- `components/charts/PeriodSelector.tsx` - reusable period selector
- `app/api/energy/history/route.ts` - pattern for fetching readings

## Key Data Structures

```typescript
// Input to comparison
interface UsagePeriod {
  startDate: string;
  endDate: string;
  readings: EnergyReading[];
}

// Output from comparison
interface TariffComparison {
  tariffId: number;
  providerName: string;
  tariffName: string;
  importCost: number;
  exportRevenue: number;
  standingCharges: number;
  netCost: number;
  isCurrent: boolean;
}
```

## Comparison Logic Detail

1. **Fetch readings** for date range from `energy_readings`
2. **For each tariff**:
   - Sum `gridImportWh` × applicable rate (match reading hour to period)
   - Sum `gridExportWh` × export rate
   - Add standing charge × days
   - Add PSO levy × months
   - Apply VAT if set
3. **Sort** by net cost ascending
4. **Mark** current tariff as baseline, calculate savings vs baseline

## Verification

1. Create at least 2 tariffs with different rates
2. Navigate to /compare
3. Verify usage numbers match /charts history totals
4. Verify "Best Savings" badge on lowest cost option
5. Verify current tariff shows as baseline
6. Test period selector changes recalculation
