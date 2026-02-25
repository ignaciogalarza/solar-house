/**
 * MyEnergi API Client
 *
 * A TypeScript client for the MyEnergi API, supporting Zappi, Eddi, and Harvi devices.
 *
 * SECURITY: This module handles digest authentication. Credentials must be
 * provided via environment variables:
 * - MYENERGI_SERIAL: Your hub serial number
 * - MYENERGI_API_KEY: Your API key
 *
 * @example
 * ```typescript
 * import { createMyEnergiClient, ZappiChargeMode } from '@/lib/myenergi';
 *
 * // Create client (reads credentials from environment)
 * const client = createMyEnergiClient();
 *
 * // Get all Zappi status
 * const zappis = await client.getStatusZappiAll();
 *
 * // Set charge mode
 * await client.setZappiChargeMode(zappi.sno, ZappiChargeMode.Eco);
 * ```
 *
 * @module
 */

// Client exports
export { MyEnergiClient, createMyEnergiClient } from "./client";
export type { MyEnergiClientConfig } from "./client";

// Type exports
export type {
  // Device types
  Zappi,
  Eddi,
  Harvi,
  // API response types
  KeyValue,
  AppKeyValues,
  StatusAllResponse,
  ZappiStatusResponse,
  EddiStatusResponse,
  HarviStatusResponse,
  CommandResponse,
  DayHourResponse,
  HourlyData,
} from "./types";

// Enum exports
export {
  // Zappi enums
  ZappiChargeMode,
  ZappiBoostMode,
  ZappiStatus,
  ZappiErrorState,
  // Eddi enums
  EddiMode,
  EddiBoost,
  EddiHeaterStatus,
  // Error classes
  MyEnergiError,
  AuthenticationError,
  ConfigurationError,
  TimeoutError,
} from "./types";
