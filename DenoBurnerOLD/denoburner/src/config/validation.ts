/**
 * Configuration validation module
 * 
 * Provides runtime validation with detailed error messages.
 */

import type { DenoBurnerConfig, WatchItem, ThemeConfig, DownloadConfig } from "./types.ts";
import type { BundleMode } from "../bundler/types.ts";

/**
 * Validation error with path and context
 */
export interface ValidationError {
  /** JSON path to the error location */
  path: string;
  /** Human-readable error message */
  message: string;
  /** The invalid value */
  value: unknown;
  /** Expected type or format */
  expected?: string;
}

/**
 * Validation result
 */
export interface ValidationResult<T> {
  /** Whether validation passed */
  success: boolean;
  /** Validated data (only present on success) */
  data?: T;
  /** Validation errors (only present on failure) */
  errors: ValidationError[];
}

/**
 * Create a failed validation result
 */
function failure(errors: ValidationError[]): ValidationResult<never> {
  return { success: false, errors };
}

/**
 * Create a successful validation result
 */
function success<T>(data: T): ValidationResult<T> {
  return { success: true, data, errors: [] };
}

/**
 * Add path prefix to errors
 */
function prefixErrors(errors: ValidationError[], prefix: string): ValidationError[] {
  return errors.map((e) => ({
    ...e,
    path: e.path ? `${prefix}.${e.path}` : prefix,
  }));
}

/**
 * Type guard for valid bundle modes
 */
function isBundleMode(value: unknown): value is BundleMode {
  return value === "external" || value === "all" || value === false;
}

/**
 * Validate a single watch item
 */
function validateWatchItem(item: unknown, index: number): ValidationResult<WatchItem> {
  const errors: ValidationError[] = [];
  
  if (typeof item !== "object" || item === null) {
    return failure([{
      path: `[${index}]`,
      message: "Watch item must be an object",
      value: item,
      expected: "object",
    }]);
  }
  
  const obj = item as Record<string, unknown>;
  
  // pattern is required
  if (typeof obj.pattern !== "string") {
    errors.push({
      path: `[${index}].pattern`,
      message: "Pattern is required and must be a string",
      value: obj.pattern,
      expected: "string (glob pattern)",
    });
  }
  
  // transform is optional boolean
  if (obj.transform !== undefined && typeof obj.transform !== "boolean") {
    errors.push({
      path: `[${index}].transform`,
      message: "Transform must be a boolean",
      value: obj.transform,
      expected: "boolean",
    });
  }
  
  // bundle is optional BundleMode
  if (obj.bundle !== undefined && !isBundleMode(obj.bundle)) {
    errors.push({
      path: `[${index}].bundle`,
      message: 'Bundle must be "external", "all", or false',
      value: obj.bundle,
      expected: '"external" | "all" | false',
    });
  }
  
  // transpile is optional boolean
  if (obj.transpile !== undefined && typeof obj.transpile !== "boolean") {
    errors.push({
      path: `[${index}].transpile`,
      message: "Transpile must be a boolean",
      value: obj.transpile,
      expected: "boolean",
    });
  }
  
  // location is optional string, object, function, or array
  if (obj.location !== undefined) {
    const loc = obj.location;
    const validTypes = ["string", "object", "function"];
    
    if (!validTypes.includes(typeof loc) && !Array.isArray(loc)) {
      errors.push({
        path: `[${index}].location`,
        message: "Location must be a string, object, function, or array",
        value: loc,
        expected: "string | RenameOutputObject | ((file: string) => RenameOutput)",
      });
    }
  }
  
  if (errors.length > 0) {
    return failure(errors);
  }
  
  return success(obj as unknown as WatchItem);
}

/**
 * Validate watch array
 */
function validateWatch(watch: unknown): ValidationResult<WatchItem[]> {
  if (!Array.isArray(watch)) {
    return failure([{
      path: "watch",
      message: "Watch must be an array",
      value: watch,
      expected: "WatchItem[]",
    }]);
  }
  
  if (watch.length === 0) {
    return failure([{
      path: "watch",
      message: "Watch array cannot be empty",
      value: watch,
      expected: "non-empty array",
    }]);
  }
  
  const allErrors: ValidationError[] = [];
  const validItems: WatchItem[] = [];
  
  for (let i = 0; i < watch.length; i++) {
    const result = validateWatchItem(watch[i], i);
    if (result.success && result.data) {
      validItems.push(result.data);
    } else if (!result.success) {
      allErrors.push(...prefixErrors(result.errors, "watch"));
    }
  }
  
  if (allErrors.length > 0) {
    return failure(allErrors);
  }
  
  return success(validItems);
}

/**
 * Validate theme configuration
 */
function validateTheme(theme: unknown): ValidationResult<ThemeConfig> {
  if (typeof theme !== "object" || theme === null) {
    return failure([{
      path: "theme",
      message: "Theme must be an object",
      value: theme,
      expected: "ThemeConfig",
    }]);
  }
  
  const obj = theme as Record<string, unknown>;
  const validColors = [
    "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white", "gray",
    "brightBlack", "brightRed", "brightGreen", "brightYellow", "brightBlue",
    "brightMagenta", "brightCyan", "brightWhite",
  ];
  
  const errors: ValidationError[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value !== "string") {
      errors.push({
        path: `theme.${key}`,
        message: "Theme color must be a string",
        value,
        expected: "string",
      });
    } else if (!validColors.includes(value) && !value.startsWith("#") && !value.startsWith("rgb")) {
      // Allow hex colors and rgb(), but warn about unknown named colors
      // We'll be permissive here and just note valid options
    }
  }
  
  if (errors.length > 0) {
    return failure(errors);
  }
  
  return success(obj as ThemeConfig);
}

/**
 * Validate download configuration
 */
function validateDownload(download: unknown): ValidationResult<DownloadConfig> {
  if (typeof download !== "object" || download === null) {
    return failure([{
      path: "download",
      message: "Download configuration must be an object",
      value: download,
      expected: "DownloadConfig",
    }]);
  }
  
  const obj = download as Record<string, unknown>;
  const errors: ValidationError[] = [];
  
  // servers is optional string array
  if (obj.servers !== undefined) {
    if (!Array.isArray(obj.servers) || !obj.servers.every((s) => typeof s === "string")) {
      errors.push({
        path: "download.servers",
        message: "Servers must be an array of strings",
        value: obj.servers,
        expected: "string[]",
      });
    }
  }
  
  // location is optional function
  if (obj.location !== undefined && typeof obj.location !== "function") {
    errors.push({
      path: "download.location",
      message: "Location must be a function",
      value: obj.location,
      expected: "(file: string, server: string) => string",
    });
  }
  
  // ignoreTs is optional boolean
  if (obj.ignoreTs !== undefined && typeof obj.ignoreTs !== "boolean") {
    errors.push({
      path: "download.ignoreTs",
      message: "ignoreTs must be a boolean",
      value: obj.ignoreTs,
      expected: "boolean",
    });
  }
  
  // ignoreSourcemap is optional boolean
  if (obj.ignoreSourcemap !== undefined && typeof obj.ignoreSourcemap !== "boolean") {
    errors.push({
      path: "download.ignoreSourcemap",
      message: "ignoreSourcemap must be a boolean",
      value: obj.ignoreSourcemap,
      expected: "boolean",
    });
  }
  
  if (errors.length > 0) {
    return failure(errors);
  }
  
  return success(obj as DownloadConfig);
}

/**
 * Validate port number
 */
function validatePort(port: unknown): ValidationResult<number> {
  if (typeof port !== "number") {
    return failure([{
      path: "port",
      message: "Port must be a number",
      value: port,
      expected: "number",
    }]);
  }
  
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return failure([{
      path: "port",
      message: "Port must be an integer between 1 and 65535",
      value: port,
      expected: "1-65535",
    }]);
  }
  
  return success(port);
}

/**
 * Validate timeout number
 */
function validateTimeout(timeout: unknown): ValidationResult<number> {
  if (typeof timeout !== "number") {
    return failure([{
      path: "timeout",
      message: "Timeout must be a number",
      value: timeout,
      expected: "number",
    }]);
  }
  
  if (timeout < 0) {
    return failure([{
      path: "timeout",
      message: "Timeout must be a non-negative number",
      value: timeout,
      expected: "number >= 0",
    }]);
  }
  
  return success(timeout);
}

/**
 * Validate the full configuration
 */
export function validateConfig(config: unknown): ValidationResult<DenoBurnerConfig> {
  if (typeof config !== "object" || config === null) {
    return failure([{
      path: "",
      message: "Configuration must be an object",
      value: config,
      expected: "DenoBurnerConfig",
    }]);
  }
  
  const obj = config as Record<string, unknown>;
  const errors: ValidationError[] = [];
  const validConfig: Record<string, unknown> = {};
  
  // Validate required watch field
  if (obj.watch === undefined) {
    errors.push({
      path: "watch",
      message: "Watch configuration is required",
      value: undefined,
      expected: "WatchItem[]",
    });
  } else {
    const watchResult = validateWatch(obj.watch);
    if (watchResult.success) {
      validConfig.watch = watchResult.data;
    } else {
      errors.push(...watchResult.errors);
    }
  }
  
  // Validate optional port
  if (obj.port !== undefined) {
    const portResult = validatePort(obj.port);
    if (portResult.success) {
      validConfig.port = portResult.data;
    } else {
      errors.push(...portResult.errors);
    }
  }
  
  // Validate optional timeout
  if (obj.timeout !== undefined) {
    const timeoutResult = validateTimeout(obj.timeout);
    if (timeoutResult.success) {
      validConfig.timeout = timeoutResult.data;
    } else {
      errors.push(...timeoutResult.errors);
    }
  }
  
  // Validate optional sourceMap
  if (obj.sourceMap !== undefined && typeof obj.sourceMap !== "boolean") {
    errors.push({
      path: "sourceMap",
      message: "sourceMap must be a boolean",
      value: obj.sourceMap,
      expected: "boolean",
    });
  } else if (obj.sourceMap !== undefined) {
    validConfig.sourceMap = obj.sourceMap;
  }
  
  // Validate optional minify
  if (obj.minify !== undefined && typeof obj.minify !== "boolean") {
    errors.push({
      path: "minify",
      message: "minify must be a boolean",
      value: obj.minify,
      expected: "boolean",
    });
  } else if (obj.minify !== undefined) {
    validConfig.minify = obj.minify;
  }
  
  // Validate optional outDir
  if (obj.outDir !== undefined && typeof obj.outDir !== "string") {
    errors.push({
      path: "outDir",
      message: "outDir must be a string",
      value: obj.outDir,
      expected: "string",
    });
  } else if (obj.outDir !== undefined) {
    validConfig.outDir = obj.outDir;
  }
  
  // Validate optional ignoreInitial
  if (obj.ignoreInitial !== undefined && typeof obj.ignoreInitial !== "boolean") {
    errors.push({
      path: "ignoreInitial",
      message: "ignoreInitial must be a boolean",
      value: obj.ignoreInitial,
      expected: "boolean",
    });
  } else if (obj.ignoreInitial !== undefined) {
    validConfig.ignoreInitial = obj.ignoreInitial;
  }
  
  // Validate optional logLevel
  const VALID_LOG_LEVELS = ["debug", "info", "warn", "error", "success"];
  if (obj.logLevel !== undefined) {
    if (typeof obj.logLevel !== "string" || !VALID_LOG_LEVELS.includes(obj.logLevel)) {
      errors.push({
        path: "logLevel",
        message: `logLevel must be one of: ${VALID_LOG_LEVELS.join(", ")}`,
        value: obj.logLevel,
        expected: JSON.stringify(VALID_LOG_LEVELS),
      });
    } else {
      validConfig.logLevel = obj.logLevel;
    }
  }
  
  // Validate optional theme
  if (obj.theme !== undefined) {
    const themeResult = validateTheme(obj.theme);
    if (themeResult.success) {
      validConfig.theme = themeResult.data;
    } else {
      errors.push(...themeResult.errors);
    }
  }
  
  // Validate optional download
  if (obj.download !== undefined) {
    const downloadResult = validateDownload(obj.download);
    if (downloadResult.success) {
      validConfig.download = downloadResult.data;
    } else {
      errors.push(...downloadResult.errors);
    }
  }
  
  // Validate optional extends (for inheritance)
  if (obj.extends !== undefined) {
    const ext = obj.extends;
    const isValid = typeof ext === "string" || 
      (Array.isArray(ext) && ext.every((e) => typeof e === "string"));
    
    if (!isValid) {
      errors.push({
        path: "extends",
        message: "extends must be a string or array of strings",
        value: ext,
        expected: "string | string[]",
      });
    } else {
      validConfig.extends = ext;
    }
  }
  
  // Validate optional version (for migration)
  if (obj.version !== undefined && typeof obj.version !== "string") {
    errors.push({
      path: "version",
      message: "version must be a string",
      value: obj.version,
      expected: "string (semver)",
    });
  } else if (obj.version !== undefined) {
    validConfig.version = obj.version;
  }
  
  // Validate optional plugins
  if (obj.plugins !== undefined) {
    if (typeof obj.plugins !== "object" || obj.plugins === null) {
      errors.push({
        path: "plugins",
        message: "plugins must be an object",
        value: obj.plugins,
        expected: "Record<string, unknown>",
      });
    } else {
      validConfig.plugins = obj.plugins;
    }
  }
  
  if (errors.length > 0) {
    return failure(errors);
  }
  
  return success(validConfig as unknown as DenoBurnerConfig);
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  const lines: string[] = ["Configuration validation failed:"];
  
  for (const error of errors) {
    const path = error.path || "(root)";
    lines.push(`  • ${path}: ${error.message}`);
    if (error.expected) {
      lines.push(`    Expected: ${error.expected}`);
    }
    lines.push(`    Received: ${JSON.stringify(error.value)}`);
  }
  
  return lines.join("\n");
}
