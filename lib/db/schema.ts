import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const energyReadings = sqliteTable('energy_readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: text('timestamp').notNull().unique(),
  solarGenerationWh: integer('solar_generation_wh'),
  gridImportWh: integer('grid_import_wh'),
  gridExportWh: integer('grid_export_wh'),
  evChargeKwh: real('ev_charge_kwh'),
  hotWaterDivertedWh: integer('hot_water_diverted_wh'),
  hotWaterBoostWh: integer('hot_water_boost_wh'),
});

export const electricityTariffs = sqliteTable('electricity_tariffs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  providerName: text('provider_name'),
  tariffName: text('tariff_name'),
  tariffType: text('tariff_type'),
  isCurrent: integer('is_current', { mode: 'boolean' }).default(false),
  exportRate: real('export_rate'),
  standingCharge: real('standing_charge'),
  psoLevy: real('pso_levy'),           // Monthly PSO levy in EUR (optional)
  vatRate: real('vat_rate'),           // VAT percentage e.g. 9 for 9% (optional)
  isProspect: integer('is_prospect', { mode: 'boolean' }).default(false),
  switchingBonus: real('switching_bonus'), // One-time credit from new provider (prospect tariffs)
  exitFee: real('exit_fee'),              // One-time fee to leave current provider (current tariff)
  validFrom: text('valid_from').notNull(),
  validTo: text('valid_to'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const tariffPeriods = sqliteTable('tariff_periods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tariffId: integer('tariff_id').references(() => electricityTariffs.id),
  name: text('name'),
  rate: real('rate'),
  startTime: text('start_time'),
  endTime: text('end_time'),
  daysOfWeek: text('days_of_week'),
});

export const gasTariffs = sqliteTable('gas_tariffs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  providerName: text('provider_name'),
  ratePerKwh: real('rate_per_kwh'),
  standingCharge: real('standing_charge'),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  isCurrent: integer('is_current', { mode: 'boolean' }).default(false),
});

export const hotWaterConfig = sqliteTable('hot_water_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gasHotWaterPercentage: integer('gas_hot_water_percentage'),
  boilerEfficiency: integer('boiler_efficiency').default(85),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const exportTracking = sqliteTable('export_tracking', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  year: integer('year').notNull().unique(),
  totalExportKwh: real('total_export_kwh'),
  totalRevenueEur: real('total_revenue_eur'),
  taxLimitEur: real('tax_limit_eur').default(400),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
