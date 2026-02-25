/**
 * MyEnergi API Types
 *
 * TypeScript interfaces for MyEnergi device data and API responses.
 * These types represent the data structures returned by the MyEnergi API.
 */

// =============================================================================
// Enums - Device Modes and States
// =============================================================================

/**
 * Eddi boost control modes
 */
export enum EddiBoost {
  CancelHeater1 = "1-1",
  CancelHeater2 = "1-2",
  CancelRelay1 = "1-11",
  CancelRelay2 = "1-12",
  ManualHeater1 = "10-1",
  ManualHeater2 = "10-2",
  ManualRelay1 = "10-11",
  ManualRelay2 = "10-12",
}

/**
 * Eddi heater status codes
 */
export enum EddiHeaterStatus {
  Starting = 0,
  Paused = 1, // Waiting for export
  DSR = 2, // Demand Side Response
  Diverting = 3,
  Boost = 4,
  Hot = 5,
  Stopped = 6,
}

/**
 * Eddi operating mode
 */
export enum EddiMode {
  Off = 0,
  On = 1,
}

/**
 * Zappi boost modes
 */
export enum ZappiBoostMode {
  Manual = 10,
  Smart = 11,
  Stop = 2,
}

/**
 * Zappi charging modes
 */
export enum ZappiChargeMode {
  /**
   * Turn charging off
   */
  Off = 4,
  /**
   * Fast will use the maximum amount of power when charging.
   */
  Fast = 1,
  /**
   * Eco will try to match the generated surplus.
   * Below 1.4 kW generated, it will draw the rest from the grid.
   */
  Eco = 2,
  /**
   * Eco+ will try to charge with generated surplus only.
   * Below 1.4 kW generated, it will pause charging.
   */
  EcoPlus = 3,
}

/**
 * Zappi pilot states indicating EV connection status
 */
export enum ZappiStatus {
  EvDisconnected = "A",
  EvConnected = "B1",
  WaitingForEv = "B2",
  EvReadyToCharge = "C1",
  Charging = "C2",
  Fault = "F",
}

// =============================================================================
// Device Interfaces
// =============================================================================

/**
 * Zappi EV charger device data
 *
 * Zappi Charge States Matrix:
 *
 * PST/STA       | 0=Starting | 1=Waiting | 2=DSR | 3=Diverting | 4=Boosting | 5=Complete
 * --------------|------------|-----------|-------|-------------|------------|------------
 * A=Disconnected| -          | Not conn  | -     | -           | -          | -
 * B1=Connected  | -          | Waiting   | -     | -           | Waiting    | Complete
 * B2=Waiting EV | -          | Delayed   | -     | -           | Delayed    | Complete
 * C1=Ready      | -          | Waiting   | -     | -           | Boosting   | Complete
 * C2=Charging   | -          | Charging  | -     | Charging    | Boosting   | -
 * F=Fault       | Fault      | Fault     | Fault | Fault       | Fault      | Fault
 */
export interface Zappi {
  /** Zappi Serial number */
  sno: string;

  /** Current Date */
  dat: string;

  /** Current Time */
  tim: string;

  /** Physical CT connection 1 value Watts */
  ectp1: number;

  /** Physical CT connection 2 value Watts */
  ectp2: number;

  /** Physical CT connection 3 value Watts */
  ectp3: number;

  /** Physical CT connection 4 value Watts */
  ectp4: number;

  /** Physical CT connection 5 value Watts */
  ectp5: number;

  /** Physical CT connection 6 value Watts */
  ectp6: number;

  /** CT 1 Name */
  ectt1: string;

  /** CT 2 Name */
  ectt2: string;

  /** CT 3 Name */
  ectt3: string;

  /** CT 4 Name */
  ectt4: string;

  /** CT 5 Name */
  ectt5: string;

  /** CT 6 Name */
  ectt6: string;

  /**
   * Command Timer
   * Counts 1-10 when command sent, then:
   * - 254 = success
   * - 253 = failure
   * - 255 = never received any commands
   */
  cmt: number;

  /** Use Daylight Savings Time */
  dst: number;

  /** Diversion amount Watts (may not appear if zero) */
  div: number;

  /** Supply Frequency */
  frq: number;

  /** Firmware Version */
  fwv: string;

  /** Generated Watts */
  gen: number;

  /** Watts from grid (negative if exporting) */
  grd: number;

  /** Minimum Green Level percentage */
  mgl: number;

  /** Number of Phases in the installation */
  pha: number;

  /** Priority */
  pri: number;

  /**
   * Status code:
   * - 0 = Starting
   * - 1 = Waiting for export
   * - 2 = DSR
   * - 3 = Diverting
   * - 4 = Boosting
   * - 5 = Hot
   * - 6 = Stopped
   */
  sta: number;

  /** Timezone offset */
  tz: number;

  /** Voltage (divide by 10 for actual voltage) */
  vol: number;

  /** Latest charge session - Charge added in kWh */
  che: number;

  /**
   * Lock Status (4 bits):
   * - Bit 0: Locked Now
   * - Bit 1: Lock when plugged in
   * - Bit 2: Lock when unplugged
   * - Bit 3: Charge when locked
   * - Bit 4: Charge Session Allowed
   */
  lck: number;

  /**
   * Pilot State:
   * - A = EV Disconnected
   * - B1 = EV Connected
   * - B2 = Waiting for EV
   * - C1 = Ready to charge
   * - C2 = Charging Max Power
   * - F = Fault/Restart
   */
  pst: string;

  /** Boost Manual: 1 = ON, 0 = OFF */
  bsm: number;

  /** Boost Smart: 1 = ON, 0 = OFF */
  bss: number;

  /** Boost Timed: 1 = ON, 0 = OFF */
  bst: number;

  /** Smart Boost Start Time Hour */
  sbh: number;

  /** Smart Boost kWh to add */
  sbk: number;

  /** Smart Boost Start Time Minute */
  sbm: number;

  /** Timed boost hour */
  tbh: number;

  /** Timed boost kWh (remaining = tbk - che) */
  tbk: number;

  /** Timed boost minute */
  tbm: number;

  /**
   * Zappi Charge Mode:
   * - 1 = Fast
   * - 2 = Eco
   * - 3 = Eco+
   * - 4 = Stopped
   */
  zmo: number;

  /**
   * Error state (only visible on errors)
   * See ZappiErrorState enum for values
   */
  zsh: number;

  /** Unknown fields */
  rdc: number;
  rac: number;
  rrac: number;
  zs: number;
  zsl: number;
}

/**
 * Eddi solar diverter device data
 */
export interface Eddi {
  /** Eddi Serial Number */
  sno: string;

  /** Boost Mode - 1 if boosting */
  bsm: number;

  /** Total kWh transferred this session */
  che: number;

  /** Command Timer (254=success, 253=failure, 255=never received) */
  cmt: number;

  /** Date */
  dat: string;

  /** Diversion amount Watts */
  div: number;

  /** Daylight Savings Time enabled */
  dst: number;

  /** Physical CT connection 1 value Watts */
  ectp1: number;

  /** Physical CT connection 2 value Watts */
  ectp2: number;

  /** Physical CT connection 3 value Watts */
  ectp3: number;

  /** CT 1 name */
  ectt1: string;

  /** CT 2 name */
  ectt2: string;

  /** CT 3 name */
  ectt3: string;

  /** Supply Frequency */
  frq: number;

  /** Firmware version */
  fwv: number;

  /** Generated Watts */
  gen: number;

  /** Current Watts from Grid (negative if sending to grid) */
  grd: number;

  /** Currently active heater (1 or 2) */
  hno: number;

  /** Heater 1 name */
  ht1: string;

  /** Heater 2 name */
  ht2: string;

  /** Phase number */
  pha: number;

  /** Priority */
  pri: number;

  /** Relay status fields */
  r1a: number;
  r2a: number;
  r2b: number;

  /** Remaining boost time in seconds (if boosting) */
  rbt: number;

  /** Status: 1=Paused, 3=Diverting, 4=Boost, 5=Max Temp, 6=Stopped */
  sta: number;

  /** Time */
  tim: string;

  /** Temperature probe 1 (degrees C) */
  tp: number;

  /** Temperature probe 2 (degrees C) */
  tp2: number;

  /** Voltage (divide by 10) */
  vol: number;
}

/**
 * Harvi energy harvesting sensor device data
 */
export interface Harvi {
  /** Harvi serial number */
  sno: string;

  /** Date */
  dat: string;

  /** Time */
  tim: string;

  /** Physical CT connection 1 value Watts */
  ectp1: number;

  /** Physical CT connection 2 value Watts */
  ectp2: number;

  /** Physical CT connection 3 value Watts */
  ectp3: number;

  /** CT 1 Name */
  ectt1: string;

  /** CT 2 Name */
  ectt2: string;

  /** CT 3 Name */
  ectt3: string;

  /** CT 1 Phase */
  ect1p: number;

  /** CT 2 Phase */
  ect2p: number;

  /** CT 3 Phase */
  ect3p: number;

  /** Firmware version */
  fwv: string;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Key-value pair for app configuration
 */
export interface KeyValue {
  key: string;
  val: string;
}

/**
 * App key values response
 */
export interface AppKeyValues {
  [name: string]: KeyValue[];
}

/**
 * Status response containing all devices
 */
export interface StatusAllResponse {
  zappi?: Zappi[];
  eddi?: Eddi[];
  harvi?: Harvi[];
  [key: string]: unknown;
}

/**
 * Zappi status response
 */
export interface ZappiStatusResponse {
  zappi?: Zappi[];
}

/**
 * Eddi status response
 */
export interface EddiStatusResponse {
  eddi?: Eddi[];
}

/**
 * Harvi status response
 */
export interface HarviStatusResponse {
  harvi?: Harvi[];
}

/**
 * Generic command response
 */
export interface CommandResponse {
  status?: number;
  statustext?: string;
  [key: string]: unknown;
}

// =============================================================================
// History/Energy Data Types
// =============================================================================

/**
 * Hourly energy data point
 */
export interface HourlyData {
  /** Hour of the day (0-23) */
  hr: number;

  /** Import energy Wh */
  imp?: number;

  /** Export energy Wh */
  exp?: number;

  /** Generated energy Wh */
  gep?: number;

  /** Diverted energy Wh */
  h1d?: number;

  /** Boosted energy Wh */
  h1b?: number;
}

/**
 * Day hour history response
 */
export interface DayHourResponse {
  /** Device serial number */
  sno?: string;

  /** Year */
  yr?: number;

  /** Month (1-12) */
  mon?: number;

  /** Day of month (1-31) */
  dom?: number;

  /** Day of week */
  dow?: string;

  /** Hourly data array */
  data?: HourlyData[];

  [key: string]: unknown;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * MyEnergi API error
 */
export class MyEnergiError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = "MyEnergiError";
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, MyEnergiError.prototype);
  }
}

/**
 * Authentication error - credentials invalid or missing
 */
export class AuthenticationError extends MyEnergiError {
  constructor(message = "Authentication failed") {
    super(message, "AUTH_FAILED", 401);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Configuration error - missing required configuration
 */
export class ConfigurationError extends MyEnergiError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
    this.name = "ConfigurationError";
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Timeout error - request took too long
 */
export class TimeoutError extends MyEnergiError {
  constructor(message = "Request timed out") {
    super(message, "TIMEOUT", 408);
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Zappi error state codes
 */
export enum ZappiErrorState {
  EV_STARTUP = 0,
  EV_DISC = 1,
  EV_JUST_DISCONNECTED = 2,
  EV_CONNECTED_START = 3,
  EV_CONNECTED = 4,
  EVSE_SURPLUS_AVAILABLE = 5,
  EVSE_LOCKED = 6,
  EVSE_WAIT_FOR_TEMP = 7,
  EVSE_WAITING_FOR_EV = 8,
  EV_CHARGE_DELAYED = 9,
  EV_CHARGE_COMPLETE = 10,
  EVSE_RCD_CHECK = 11,
  EVSE_CHARGING = 12,
  EVSE_IMPORTING = 13,
  EV_CHARGE_STOPPING = 14,
  EV_READY_LEGACY_START = 15,
  EV_READY_LEGACY = 16,
  EVSE_WAIT_FOR_LIMIT = 17,
  EV_VENT = 18,
  EVSE_RESTARTING = 19,
  EVSE_PHASE_SWITCHING_RESTART = 20,
  EV_WRONG_CABLE = 21,
  EVSE_BAD_PILOT = 22,
  EVSE_FAULT_LOCK = 23,
  EVSE_FAULT_OUTPUT = 24,
  EVSE_FAULT_PE = 25,
  EVSE_FAULT_COMS = 26,
  EVSE_SELFTEST_FAILED = 27,
  EVSE_FAULT_CONTACTOR = 28,
  EVSE_FAULT_RCD_TRIP = 29,
  EVSE_FAULT_OVERLOAD = 30,
  EVSE_FAULT_VOLTAGE_RANGE = 31,
  EVSE_FAULT_VOLTAGE_MISMATCH = 32,
  EVSE_WRONG_PHASE_ROTATION = 33,
  CHARGE_BLOCKED = 50,
  EV_PRECON = 51,
  EVSE_PHSW_DELAY = 52,
  EVSE_CHARGE_STOPPED = 53,
}
