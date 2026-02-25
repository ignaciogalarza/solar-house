/**
 * MyEnergi API Client
 *
 * SECURITY-CRITICAL: This module handles digest authentication with the MyEnergi API.
 * All credentials must come from environment variables - NEVER hardcode secrets.
 *
 * Security considerations:
 * - Credentials are never logged or exposed in error messages
 * - Timeout handling prevents hanging connections
 * - Proper error handling without leaking sensitive information
 * - Director service discovery handles server redirects securely
 */

import * as crypto from "crypto";
import * as https from "https";
import type { RequestOptions, IncomingMessage } from "https";
import {
  type Zappi,
  type Eddi,
  type Harvi,
  type KeyValue,
  type AppKeyValues,
  type StatusAllResponse,
  type CommandResponse,
  type DayHourResponse,
  ZappiChargeMode,
  ZappiBoostMode,
  EddiMode,
  EddiBoost,
  MyEnergiError,
  AuthenticationError,
  ConfigurationError,
  TimeoutError,
} from "./types";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_BASE_URL = "https://s18.myenergi.net";
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const MAX_REDIRECT_COUNT = 3;
const MAX_RETRY_COUNT = 2;

// =============================================================================
// Digest Authentication
// =============================================================================

/**
 * HTTP Digest Authentication handler
 *
 * SECURITY: This class handles the digest authentication challenge-response.
 * Credentials are stored in memory only and never logged.
 */
class DigestAuth {
  private username: string;
  private password: string;
  private realm?: string;
  private nonce?: string;
  private qop?: string;
  private opaque?: string;
  private algorithm = "MD5";
  private nc = 0;
  private initialized = false;

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
  }

  /**
   * Generate MD5 hash
   */
  private md5(data: string): string {
    return crypto.createHash("md5").update(data).digest("hex");
  }

  /**
   * Generate client nonce
   */
  private generateCnonce(): string {
    return this.md5(String(Date.now()) + Math.random().toString());
  }

  /**
   * Get next nonce count as 8-digit hex string
   */
  private getNC(): string {
    this.nc++;
    return this.nc.toString(16).padStart(8, "0");
  }

  /**
   * Initialize from WWW-Authenticate header
   *
   * SECURITY: Parses authentication challenge without exposing credentials
   */
  public init(wwwAuthHeader: string): void {
    if (!wwwAuthHeader) {
      return;
    }

    const authParts = wwwAuthHeader.split(",");

    for (const part of authParts) {
      const trimmed = part.trim();

      if (trimmed.includes("realm=")) {
        const match = trimmed.match(/realm="([^"]+)"/);
        if (match) {
          this.realm = match[1];
        }
      }

      if (trimmed.includes("nonce=")) {
        const match = trimmed.match(/nonce="([^"]+)"/);
        if (match) {
          this.nonce = match[1];
        }
      }

      if (trimmed.includes("qop=")) {
        const match = trimmed.match(/qop="([^"]+)"/);
        if (match) {
          this.qop = match[1];
        }
      }

      if (trimmed.includes("opaque=")) {
        const match = trimmed.match(/opaque="([^"]+)"/);
        if (match) {
          this.opaque = match[1];
        }
      }

      if (trimmed.includes("algorithm=")) {
        const match = trimmed.match(/algorithm=([^,\s]+)/);
        if (match) {
          this.algorithm = match[1].replace(/"/g, "");
          if (this.algorithm !== "MD5") {
            throw new MyEnergiError(
              "Only MD5 algorithm is supported",
              "UNSUPPORTED_ALGORITHM"
            );
          }
        }
      }
    }

    this.initialized = true;
  }

  /**
   * Generate Authorization header value
   *
   * SECURITY: This generates the digest response without exposing the password
   */
  public getAuthorization(method: string, path: string): string {
    if (!this.initialized) {
      return "";
    }

    const nc = this.getNC();
    const cnonce = this.generateCnonce();

    // HA1 = MD5(username:realm:password)
    const ha1 = this.md5(`${this.username}:${this.realm}:${this.password}`);

    // HA2 = MD5(method:path)
    const ha2 = this.md5(`${method}:${path}`);

    // Response = MD5(HA1:nonce:nc:cnonce:qop:HA2)
    const response = this.md5(
      `${ha1}:${this.nonce}:${nc}:${cnonce}:${this.qop}:${ha2}`
    );

    return [
      `Digest username="${this.username}"`,
      `realm="${this.realm}"`,
      `nonce="${this.nonce}"`,
      `uri="${path}"`,
      `cnonce="${cnonce}"`,
      `nc=${nc}`,
      `algorithm=${this.algorithm}`,
      `response="${response}"`,
      `qop="${this.qop}"`,
      `opaque="${this.opaque}"`,
    ].join(",");
  }
}

// =============================================================================
// HTTP Client with Digest Auth
// =============================================================================

/**
 * HTTP client with digest authentication and server discovery
 *
 * SECURITY: Handles authentication challenges and server redirects securely
 */
class DigestHttpClient {
  private auth: DigestAuth;
  private baseUrl: URL;
  private timeoutMs: number;
  private etags: Map<string, string> = new Map();

  constructor(baseUrl: string, username: string, password: string, timeoutMs: number) {
    this.baseUrl = new URL(baseUrl);
    this.auth = new DigestAuth(username, password);
    this.timeoutMs = timeoutMs;
  }

  /**
   * Make authenticated GET request
   */
  public async get(requestUrl: URL): Promise<string> {
    const options: RequestOptions = {
      hostname: this.baseUrl.hostname,
      host: this.baseUrl.host,
      port: this.baseUrl.port || 443,
      path: requestUrl.pathname,
      method: "GET",
      headers: {
        Connection: "Keep-Alive",
        "Content-Type": "application/json",
        Accept: "application/json",
        Host: this.baseUrl.hostname,
      },
    };

    return this.request(options);
  }

  /**
   * Execute HTTP request with digest authentication
   *
   * SECURITY:
   * - Handles 401 challenges by initializing digest auth
   * - Follows MyEnergi director service redirects
   * - Implements timeouts to prevent hanging
   * - Never exposes credentials in error messages
   */
  private request(
    options: RequestOptions,
    retryCount = 0,
    redirectCount = 0
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Set authorization header if we have credentials
      if (!options.headers) {
        options.headers = {};
      }
      options.headers.Authorization = this.auth.getAuthorization(
        options.method as string,
        options.path as string
      );

      // Add ETag for conditional requests
      const etag = this.etags.get(options.path as string);
      if (etag) {
        options.headers["If-None-Match"] = etag;
      }

      const req = https.request(options, (res: IncomingMessage) => {
        this.handleResponse(res, options, retryCount, redirectCount)
          .then(resolve)
          .catch(reject);
      });

      // SECURITY: Timeout prevents hanging connections
      req.setTimeout(this.timeoutMs, () => {
        req.destroy();
        reject(new TimeoutError(`Request timed out after ${this.timeoutMs}ms`));
      });

      req.on("error", (error: Error) => {
        // SECURITY: Don't expose internal error details that might leak info
        reject(
          new MyEnergiError(
            "Network request failed",
            "NETWORK_ERROR"
          )
        );
      });

      req.end();
    });
  }

  /**
   * Handle HTTP response
   */
  private async handleResponse(
    res: IncomingMessage,
    options: RequestOptions,
    retryCount: number,
    redirectCount: number
  ): Promise<string> {
    // Store ETag for future conditional requests
    if (res.headers.etag) {
      this.etags.set(options.path as string, res.headers.etag as string);
    }

    // Handle MyEnergi director service redirect (via custom header)
    const myenergiAsn = res.headers["x_myenergi-asn"] as string | undefined;
    if (myenergiAsn && myenergiAsn !== "undefined" && myenergiAsn !== this.baseUrl.host) {
      if (redirectCount >= MAX_REDIRECT_COUNT) {
        throw new MyEnergiError("Too many redirects", "REDIRECT_LIMIT");
      }

      // Update base URL to new server
      this.baseUrl.host = myenergiAsn;
      this.baseUrl.hostname = myenergiAsn;
      options.host = myenergiAsn;
      options.hostname = myenergiAsn;

      return this.request(options, retryCount, redirectCount + 1);
    }

    // Handle 401 Unauthorized - need to authenticate
    if (res.statusCode === 401) {
      if (retryCount >= MAX_RETRY_COUNT) {
        throw new AuthenticationError();
      }

      const wwwAuth = res.headers["www-authenticate"] as string | undefined;
      if (!wwwAuth || !wwwAuth.startsWith("Digest")) {
        throw new MyEnergiError(
          "Unsupported authentication method",
          "UNSUPPORTED_AUTH"
        );
      }

      // Initialize digest auth from challenge
      this.auth.init(wwwAuth);

      // Update authorization header and retry
      if (!options.headers) {
        options.headers = {};
      }
      options.headers.Authorization = this.auth.getAuthorization(
        options.method as string,
        options.path as string
      );

      return this.request(options, retryCount + 1, redirectCount);
    }

    // Handle success responses
    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
      return this.readResponseBody(res);
    }

    // Handle 304 Not Modified
    if (res.statusCode === 304) {
      return "{}";
    }

    // Handle standard redirects
    if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
      if (redirectCount >= MAX_REDIRECT_COUNT) {
        throw new MyEnergiError("Too many redirects", "REDIRECT_LIMIT");
      }

      const location = res.headers.location;
      if (location) {
        const uri = new URL(location);
        if (uri.host !== this.baseUrl.host) {
          this.baseUrl.host = uri.host;
          this.baseUrl.hostname = uri.hostname;
          options.host = uri.host;
          options.hostname = uri.hostname;
        }
      }

      return this.request(options, retryCount, redirectCount + 1);
    }

    // Handle other errors
    throw new MyEnergiError(
      `Request failed with status ${res.statusCode}`,
      "HTTP_ERROR",
      res.statusCode
    );
  }

  /**
   * Read response body as string
   */
  private readResponseBody(res: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = "";
      res.setEncoding("utf8");

      res.on("data", (chunk: string) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve(data);
      });

      res.on("error", () => {
        reject(new MyEnergiError("Failed to read response", "READ_ERROR"));
      });
    });
  }
}

// =============================================================================
// MyEnergi API Client
// =============================================================================

/**
 * Client configuration options
 */
export interface MyEnergiClientConfig {
  /** Hub serial number (from MYENERGI_SERIAL env var) */
  serial?: string;
  /** API key/password (from MYENERGI_API_KEY env var) */
  apiKey?: string;
  /** Base URL for API (optional, uses director service) */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * MyEnergi API Client
 *
 * SECURITY-CRITICAL: This client handles authentication with the MyEnergi API.
 *
 * Usage:
 * ```typescript
 * // Credentials from environment variables (recommended)
 * const client = new MyEnergiClient();
 *
 * // Or explicit configuration
 * const client = new MyEnergiClient({
 *   serial: process.env.MYENERGI_SERIAL,
 *   apiKey: process.env.MYENERGI_API_KEY,
 * });
 *
 * const zappiStatus = await client.getStatusZappiAll();
 * ```
 */
export class MyEnergiClient {
  private httpClient: DigestHttpClient;
  private baseUrl: string;

  // API endpoint paths
  private readonly endpoints = {
    status: "/cgi-jstatus-*",
    zappi: "/cgi-jstatus-Z",
    eddi: "/cgi-jstatus-E",
    harvi: "/cgi-jstatus-H",
    dayHour: "/cgi-jdayhour-",
    zappiMode: "/cgi-zappi-mode-Z",
    zappiMinGreen: "/cgi-set-min-green-Z",
    zappiBoostTime: "/cgi-boost-time-Z",
    eddiMode: "/cgi-eddi-mode-E",
    eddiBoost: "/cgi-eddi-boost-E",
    getAppKey: "/cgi-get-app-key",
    setAppKey: "/cgi-set-app-key",
  };

  /**
   * Create a new MyEnergi API client
   *
   * SECURITY: Credentials should come from environment variables.
   * If not provided in config, they will be read from:
   * - MYENERGI_SERIAL
   * - MYENERGI_API_KEY
   *
   * @throws ConfigurationError if credentials are missing
   */
  constructor(config: MyEnergiClientConfig = {}) {
    // SECURITY: Read credentials from environment if not provided
    const serial = config.serial || process.env.MYENERGI_SERIAL;
    const apiKey = config.apiKey || process.env.MYENERGI_API_KEY;

    // SECURITY: Validate required credentials exist
    if (!serial) {
      throw new ConfigurationError(
        "MYENERGI_SERIAL is required. Set it as an environment variable or pass in config."
      );
    }
    if (!apiKey) {
      throw new ConfigurationError(
        "MYENERGI_API_KEY is required. Set it as an environment variable or pass in config."
      );
    }

    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;

    // Create HTTP client with digest auth
    this.httpClient = new DigestHttpClient(this.baseUrl, serial, apiKey, timeoutMs);
  }

  // ===========================================================================
  // Status Methods
  // ===========================================================================

  /**
   * Get status of all devices
   */
  public async getStatusAll(): Promise<StatusAllResponse> {
    const data = await this.httpClient.get(
      new URL(this.endpoints.status, this.baseUrl)
    );
    return this.parseJson(data);
  }

  /**
   * Get status of all Zappi devices
   */
  public async getStatusZappiAll(): Promise<Zappi[]> {
    const data = await this.httpClient.get(
      new URL(this.endpoints.zappi, this.baseUrl)
    );
    const json = this.parseJson(data);
    return json.zappi || [];
  }

  /**
   * Get status of a specific Zappi by serial number
   */
  public async getStatusZappi(serialNumber: string): Promise<Zappi | null> {
    const zappis = await this.getStatusZappiAll();
    return zappis.find((z) => z.sno === serialNumber) || null;
  }

  /**
   * Get status of all Eddi devices
   */
  public async getStatusEddiAll(): Promise<Eddi[]> {
    const data = await this.httpClient.get(
      new URL(this.endpoints.eddi, this.baseUrl)
    );
    const json = this.parseJson(data);
    return json.eddi || [];
  }

  /**
   * Get status of a specific Eddi by serial number
   */
  public async getStatusEddi(serialNumber: string): Promise<Eddi | null> {
    const eddis = await this.getStatusEddiAll();
    return eddis.find((e) => e.sno === serialNumber) || null;
  }

  /**
   * Get status of all Harvi devices
   */
  public async getStatusHarviAll(): Promise<Harvi[]> {
    const data = await this.httpClient.get(
      new URL(this.endpoints.harvi, this.baseUrl)
    );
    const json = this.parseJson(data);
    return json.harvi || [];
  }

  /**
   * Get status of a specific Harvi by serial number
   */
  public async getStatusHarvi(serialNumber: string): Promise<Harvi | null> {
    const harvis = await this.getStatusHarviAll();
    return harvis.find((h) => h.sno === serialNumber) || null;
  }

  // ===========================================================================
  // Zappi Control Methods
  // ===========================================================================

  /**
   * Set Zappi charge mode
   *
   * @param serialNo - Zappi serial number
   * @param chargeMode - Desired charge mode
   */
  public async setZappiChargeMode(
    serialNo: string,
    chargeMode: ZappiChargeMode
  ): Promise<CommandResponse> {
    // SECURITY: Validate input
    if (!serialNo || typeof serialNo !== "string") {
      throw new MyEnergiError("Invalid serial number", "INVALID_INPUT");
    }

    const url = new URL(
      `${this.endpoints.zappiMode}${serialNo}-${chargeMode}-0-0-0000`,
      this.baseUrl
    );
    const data = await this.httpClient.get(url);
    return this.parseJson(data);
  }

  /**
   * Set Zappi boost mode
   *
   * @param serialNo - Zappi serial number
   * @param boostMode - Boost mode
   * @param kwh - kWh to add (for Manual/Smart boost)
   * @param completeTime - Target completion time as HHMM (for Smart boost)
   */
  public async setZappiBoostMode(
    serialNo: string,
    boostMode: ZappiBoostMode,
    kwh = 0,
    completeTime = "0000"
  ): Promise<CommandResponse> {
    // SECURITY: Validate inputs
    if (!serialNo || typeof serialNo !== "string") {
      throw new MyEnergiError("Invalid serial number", "INVALID_INPUT");
    }

    // Stop boost resets values
    if (boostMode === ZappiBoostMode.Stop) {
      kwh = 0;
      completeTime = "0000";
    }

    const url = new URL(
      `${this.endpoints.zappiMode}${serialNo}-0-${boostMode}-${kwh}-${completeTime}`,
      this.baseUrl
    );
    const data = await this.httpClient.get(url);
    return this.parseJson(data);
  }

  /**
   * Set Zappi minimum green level (eco mode threshold)
   *
   * @param serialNo - Zappi serial number
   * @param percentage - Minimum green percentage (0-100)
   */
  public async setZappiGreenLevel(
    serialNo: string,
    percentage: number
  ): Promise<CommandResponse> {
    // SECURITY: Validate inputs
    if (!serialNo || typeof serialNo !== "string") {
      throw new MyEnergiError("Invalid serial number", "INVALID_INPUT");
    }
    if (percentage < 0 || percentage > 100) {
      throw new MyEnergiError(
        "Percentage must be between 0 and 100",
        "INVALID_INPUT"
      );
    }

    const url = new URL(
      `${this.endpoints.zappiMinGreen}${serialNo}-${Math.round(percentage)}`,
      this.baseUrl
    );
    const data = await this.httpClient.get(url);
    return this.parseJson(data);
  }

  /**
   * Get Zappi boost time schedules
   *
   * @param serialNo - Zappi serial number
   */
  public async getZappiBoostTimes(serialNo: string): Promise<CommandResponse> {
    // SECURITY: Validate input
    if (!serialNo || typeof serialNo !== "string") {
      throw new MyEnergiError("Invalid serial number", "INVALID_INPUT");
    }

    const url = new URL(
      `${this.endpoints.zappiBoostTime}${serialNo}`,
      this.baseUrl
    );
    const data = await this.httpClient.get(url);
    return this.parseJson(data);
  }

  /**
   * Set Zappi boost time schedule
   *
   * @param serialNo - Zappi serial number
   * @param slot - Time slot number
   * @param startHour - Start hour (0-23)
   * @param startMinute - Start minute (0-59)
   * @param durationHour - Duration hours
   * @param durationMinute - Duration minutes
   * @param daySpec - Day specification string
   */
  public async setZappiBoostTime(
    serialNo: string,
    slot: number,
    startHour: number,
    startMinute: number,
    durationHour: number,
    durationMinute: number,
    daySpec: string
  ): Promise<CommandResponse> {
    // SECURITY: Validate inputs
    if (!serialNo || typeof serialNo !== "string") {
      throw new MyEnergiError("Invalid serial number", "INVALID_INPUT");
    }

    const startTimeStr =
      startHour.toString().padStart(2, "0") +
      startMinute.toString().padStart(2, "0");
    const durationStr =
      durationHour.toString() + durationMinute.toString().padStart(2, "0");

    const url = new URL(
      `${this.endpoints.zappiBoostTime}${serialNo}-${slot}-${startTimeStr}-${durationStr}-${daySpec}`,
      this.baseUrl
    );
    const data = await this.httpClient.get(url);
    return this.parseJson(data);
  }

  // ===========================================================================
  // Eddi Control Methods
  // ===========================================================================

  /**
   * Set Eddi operating mode
   *
   * @param serialNo - Eddi serial number
   * @param mode - Operating mode (On/Off)
   */
  public async setEddiMode(
    serialNo: string,
    mode: EddiMode
  ): Promise<CommandResponse> {
    // SECURITY: Validate input
    if (!serialNo || typeof serialNo !== "string") {
      throw new MyEnergiError("Invalid serial number", "INVALID_INPUT");
    }

    const url = new URL(
      `${this.endpoints.eddiMode}${serialNo}-${mode}`,
      this.baseUrl
    );
    const data = await this.httpClient.get(url);
    return this.parseJson(data);
  }

  /**
   * Set Eddi boost
   *
   * @param serialNo - Eddi serial number
   * @param boost - Boost action
   * @param minutes - Duration in minutes (for manual boost)
   */
  public async setEddiBoost(
    serialNo: string,
    boost: EddiBoost,
    minutes = 0
  ): Promise<CommandResponse> {
    // SECURITY: Validate inputs
    if (!serialNo || typeof serialNo !== "string") {
      throw new MyEnergiError("Invalid serial number", "INVALID_INPUT");
    }
    if (minutes < 0) {
      throw new MyEnergiError("Minutes cannot be negative", "INVALID_INPUT");
    }

    const url = new URL(
      `${this.endpoints.eddiBoost}${serialNo}-${boost}-${minutes}`,
      this.baseUrl
    );
    const data = await this.httpClient.get(url);
    return this.parseJson(data);
  }

  // ===========================================================================
  // History Methods
  // ===========================================================================

  /**
   * Get hourly energy data for a specific day
   *
   * @param deviceType - Device type ('Z' for Zappi, 'E' for Eddi)
   * @param serialNo - Device serial number
   * @param date - Date to query
   */
  public async getDayHour(
    deviceType: "Z" | "E",
    serialNo: string,
    date: Date
  ): Promise<DayHourResponse> {
    // SECURITY: Validate inputs
    if (!serialNo || typeof serialNo !== "string") {
      throw new MyEnergiError("Invalid serial number", "INVALID_INPUT");
    }
    if (!["Z", "E"].includes(deviceType)) {
      throw new MyEnergiError("Invalid device type", "INVALID_INPUT");
    }

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    const url = new URL(
      `${this.endpoints.dayHour}${deviceType}${serialNo}-${year}-${month}-${day}`,
      this.baseUrl
    );
    const data = await this.httpClient.get(url);
    return this.parseJson(data);
  }

  // ===========================================================================
  // App Key Methods
  // ===========================================================================

  /**
   * Get app key values (full response)
   *
   * @param key - Key name
   */
  public async getAppKeyFull(key: string): Promise<AppKeyValues | null> {
    // SECURITY: Validate input
    if (!key || typeof key !== "string") {
      throw new MyEnergiError("Invalid key", "INVALID_INPUT");
    }

    const url = new URL(`${this.endpoints.getAppKey}-${key}`, this.baseUrl);
    const data = await this.httpClient.get(url);
    const json = this.parseJson(data);
    return json || null;
  }

  /**
   * Get app key values
   *
   * @param key - Key name
   */
  public async getAppKey(key: string): Promise<KeyValue[] | null> {
    const result = await this.getAppKeyFull(key);
    if (result) {
      const firstKey = Object.keys(result)[0];
      if (firstKey && result[firstKey]) {
        return result[firstKey];
      }
    }
    return null;
  }

  /**
   * Set app key value
   *
   * @param key - Key name
   * @param value - Value to set
   */
  public async setAppKey(
    key: string,
    value: string
  ): Promise<KeyValue[] | null> {
    // SECURITY: Validate inputs
    if (!key || typeof key !== "string") {
      throw new MyEnergiError("Invalid key", "INVALID_INPUT");
    }
    if (typeof value !== "string") {
      throw new MyEnergiError("Invalid value", "INVALID_INPUT");
    }

    const url = new URL(
      `${this.endpoints.setAppKey}-${key}=${encodeURIComponent(value)}`,
      this.baseUrl
    );
    const data = await this.httpClient.get(url);
    const result = this.parseJson(data);
    if (result) {
      const firstKey = Object.keys(result)[0];
      if (firstKey && result[firstKey]) {
        return result[firstKey];
      }
    }
    return null;
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Parse JSON response safely
   *
   * SECURITY: Handles malformed JSON without exposing raw response data
   */
  private parseJson<T>(data: string): T {
    try {
      return JSON.parse(data);
    } catch {
      throw new MyEnergiError("Invalid JSON response from API", "PARSE_ERROR");
    }
  }
}

/**
 * Create a MyEnergi client using environment variables
 *
 * This is the recommended way to create a client for production use.
 *
 * Required environment variables:
 * - MYENERGI_SERIAL: Your hub serial number
 * - MYENERGI_API_KEY: Your API key
 *
 * @throws ConfigurationError if required environment variables are missing
 */
export function createMyEnergiClient(
  options: Partial<MyEnergiClientConfig> = {}
): MyEnergiClient {
  return new MyEnergiClient(options);
}
