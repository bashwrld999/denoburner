/**
 * Configuration types for denoburner
 */

import type { BundleMode } from "../bundler/types.ts";

/**
 * Theme configuration for TUI colors
 */
export interface ThemeConfig {
  /** Panel border color */
  border?: string;
  /** Log prefix color */
  prefix?: string;
  /** Success message color */
  success?: string;
  /** Error message color */
  error?: string;
  /** Warning message color */
  warning?: string;
  /** Info message color */
  info?: string;
  /** Section header color (e.g., "Servers", "Files") */
  header?: string;
  /** Change indicator color */
  change?: string;
  /** Low RAM usage color (<2GB) */
  ramLow?: string;
  /** Medium RAM usage color (2-4GB) */
  ramMedium?: string;
  /** High RAM usage color (>4GB) */
  ramHigh?: string;
  /** Connected status color */
  connected?: string;
  /** Disconnected status color */
  disconnected?: string;
}

/**
 * Default theme colors (Horizon-inspired)
 * A warm, sunset-inspired color palette
 */
export const DEFAULT_THEME: Required<ThemeConfig> = {
  border: "white",          // Clean white borders
  prefix: "gray",
  success: "brightGreen",   // Brighter success
  error: "brightRed",       // Brighter error
  warning: "brightYellow",  // Brighter warning
  info: "brightBlue",       // Blue for info logs
  header: "brightMagenta",  // Horizon's warm pink for section headers
  change: "brightBlue",     // Brighter change indicator
  ramLow: "green",
  ramMedium: "yellow",
  ramHigh: "brightRed",
  connected: "green",
  disconnected: "red",
};

/**
 * Destinations for the transformed files.
 */
export type RenameOutputObject = {
  /**
   * The destination path with no starting slash.
   * If not provided, the starting `src/` will be removed and `.ts` will be replaced with `.js`.
   */
  filename?: string;
  /**
   * The destination server.
   * @default 'home'
   */
  server?: string;
};
export type RenameOutput = string | RenameOutputObject | Array<string | RenameOutputObject> | null | undefined;

/**
 * Watch preset types
 */
export type WatchPreset = "typescript" | "javascript" | "static" | "react";

/**
 * Condition for applying different settings
 */
export interface WatchCondition {
  /** Glob pattern to match file path */
  path?: string | string[];
  /** File extension to match */
  ext?: string | string[];
  /** Directory pattern to match */
  dir?: string | string[];
  /** Custom condition function */
  test?: (file: string) => boolean;
  /** Settings to apply when condition matches */
  transform?: boolean;
  bundle?: BundleMode;
  transpile?: boolean;
  location?: RenameOutput | ((file: string) => RenameOutput);
}

/**
 * Watch item configuration
 */
export interface WatchItem {
  /**
   * Glob pattern to match.
   * See {@link https://github.com/micromatch/micromatch micromatch} for more details.
   */
  pattern: string;
  
  /**
   * Use a preset configuration.
   * - "typescript": transform=true, transpile=true, bundle="external"
   * - "javascript": transform=true, transpile=false, bundle="external"
   * - "static": transform=false
   * - "react": transform=true, transpile=true, bundle="external" (with React support)
   */
  preset?: WatchPreset;
  
  /**
   * Glob patterns to exclude.
   * Example: `["**\/*.test.ts", "**\/__tests__\/**"]`
   */
  exclude?: string | string[];
  
  /**
   * Conditional settings based on file path/location.
   * Conditions are evaluated in order, first match wins.
   */
  conditions?: WatchCondition[];
  
  /**
   * Enable auto-detection of settings based on file extension.
   * When true, settings are inferred from file type:
   * - .ts, .tsx → transform=true, transpile=true, bundle="external"
   * - .js, .jsx → transform=true, transpile=false, bundle="external"
   * - .txt, .script, .json → transform=false
   * @default false
   */
  infer?: boolean;
  
  /**
   * Enable file processing (transform TS, bundle deps).
   * @default false
   */
  transform?: boolean;
  /**
   * Bundling mode (only when transform: true).
   * - "external": Only bundle external deps (npm, jsr, http), keep local imports
   * - "all": Bundle everything including local imports
   * - false: Don't bundle, just transform TS to JS
   * @default "external"
   */
  bundle?: BundleMode;
  /**
   * Transpile TypeScript to JavaScript when bundling.
   * - true (default): Bundled files are transpiled to JS (esbuild behavior)
   * - false: Keep TypeScript syntax (skips bundling for TS files with external deps)
   * 
   * Note: When transpile is false, files with external dependencies (npm, jsr, http)
   * will NOT be bundled - they'll be uploaded as-is. This means external imports
   * won't work at runtime unless the dependencies are available in Bitburner.
   * @default true
   */
  transpile?: boolean;
  /**
   * Set to a string to specify the server of output file.
   * Set to a {@link RenameOutputObject} to specify the output filename and server.
   * Set to a function to specify dynamically, the `file` param has no starting slash.
   * Set to or returns an array to specify multiple outputs.
   */
  location?: RenameOutput | ((file: string) => RenameOutput);
  
  /**
   * Only watch for cascading updates, don't upload this file.
   * When true, changes to this file will trigger re-upload of dependent server files,
   * but the file itself won't be uploaded.
   * Useful for shared utility files outside the servers directory.
   * @default false
   */
  cascadeOnly?: boolean;
}

/**
 * Watch preset configurations
 */
export const WATCH_PRESETS: Record<WatchPreset, Omit<WatchItem, "pattern">> = {
  typescript: {
    transform: true,
    transpile: true,
    bundle: "external",
  },
  javascript: {
    transform: true,
    transpile: false,
    bundle: "external",
  },
  static: {
    transform: false,
  },
  react: {
    transform: true,
    transpile: true,
    bundle: "external",
  },
};

/**
 * Download configuration
 */
export interface DownloadConfig {
  /** Servers to download from */
  servers?: string[];
  /** Function to determine output path */
  location?: (file: string, server: string) => string;
  /** Skip .ts files */
  ignoreTs?: boolean;
  /** Skip .map files */
  ignoreSourcemap?: boolean;
}

/**
 * Upload configuration
 */
export interface UploadConfig {
  /**
   * Upload strategy to use.
   * - "immediate": Upload files one at a time
   * - "batched": Collect files and upload in batches
   * - "parallel": Upload multiple files concurrently
   * @default "parallel"
   */
  strategy?: "immediate" | "batched" | "parallel";
  
  /**
   * Maximum concurrent uploads for parallel strategy.
   * @default 5
   */
  concurrency?: number;
  
  /**
   * Delay in ms before checking RAM usage after upload.
   * @default 200
   */
  ramDelay?: number;
  
  /**
   * Batch size for batched strategy.
   * @default 10
   */
  batchSize?: number;
  
  /**
   * Batch timeout in ms for batched strategy.
   * @default 1000
   */
  batchTimeout?: number;
}

/**
 * HMR (Hot Module Replacement) configuration
 */
export interface HmrConfig {
  /**
   * Enable cascading updates when dependencies change.
   * When a shared file changes, all files that import it will be re-uploaded.
   * @default true
   */
  cascadingUpdates?: boolean;
  
  /**
   * Maximum depth for cascading updates.
   * Prevents infinite loops in circular dependency chains.
   * @default 10
   */
  maxCascadeDepth?: number;
  
  /**
   * Enable batching of multiple file changes.
   * Groups rapid file changes into a single batch operation.
   * @default true
   */
  batching?: boolean;
  
  /**
   * Delay in ms to wait for more changes before processing a batch.
   * @default 50
   */
  batchDelay?: number;
  
  /**
   * Maximum batch size before forcing a flush.
   * @default 100
   */
  maxBatchSize?: number;
  
  /**
   * Enable file content caching to skip unchanged files.
   * @default true
   */
  caching?: boolean;
  
  /**
   * Enable change metadata tracking for smarter re-upload decisions.
   * @default true
   */
  trackChanges?: boolean;
}

/**
 * Main configuration for denoburner
 */
export interface DenoBurnerConfig {
  /**
   * Port for Bitburner Remote API connection.
   * @default 12525
   */
  port?: number;

  /**
   * Connection timeout in milliseconds.
   * @default 10000
   */
  timeout?: number;

  /**
   * Minimum log level to display.
   * - "debug": Show all logs including debug
   * - "info": Show info, warn, error, success
   * - "warn": Show warn, error, success
   * - "error": Show only error and success
   * - "success": Show only success and error
   * @default "debug"
   */
  logLevel?: "debug" | "info" | "warn" | "error" | "success";

  /**
   * Generate source maps.
   * @default false
   */
  sourceMap?: boolean;

  /**
   * Minify output.
   * @default false
   */
  minify?: boolean;

  /**
   * Output directory for build command.
   * @default 'dist'
   */
  outDir?: string;

  /**
   * Root directory for file resolution.
   * @default Deno.cwd()
   */
  rootDir?: string;

  /**
   * Directory containing server scripts.
   * Used for dependency analysis to determine local vs external imports.
   * @default 'src/servers'
   */
  serversDir?: string;

  /**
   * Watch patterns configuration.
   */
  watch: WatchItem[];

  /**
   * Skip initial upload on dev server start.
   * @default false
   */
  ignoreInitial?: boolean;

  /**
   * TUI theme configuration.
   */
  theme?: ThemeConfig;

  /**
   * Download configuration.
   */
  download?: DownloadConfig;

  /**
   * Upload configuration.
   */
  upload?: UploadConfig;

  /**
   * HMR (Hot Module Replacement) configuration.
   */
  hmr?: HmrConfig;
}

/**
 * User configuration (partial)
 */
export interface DenoBurnerUserConfig extends Partial<DenoBurnerConfig> {
  /**
   * Extend from base config file(s).
   * Later configs override earlier ones.
   */
  extends?: string | string[];
  
  /**
   * Config schema version for migration purposes.
   */
  version?: string;
  
  /**
   * Plugin-specific configuration.
   */
  plugins?: Record<string, unknown>;
}

// Resolved types

/**
 * Resolved watch item with all options filled
 */
export interface ResolvedWatchItem {
  pattern: string;
  transform: boolean;
  bundle: BundleMode;
  transpile: boolean;
  location: (file: string) => {
    filename: string;
    server: string;
  }[];
  /** Glob patterns to exclude */
  exclude?: string[];
  /** Conditional settings based on file path */
  conditions?: WatchCondition[];
  /** Enable auto-detection of settings based on file extension */
  infer?: boolean;
  /** Only watch for cascading updates, don't upload this file */
  cascadeOnly?: boolean;
}

/**
 * Resolved configuration with all options filled
 */
export interface ResolvedDenoBurnerConfig {
  port: number;
  timeout: number;
  logLevel: "debug" | "info" | "warn" | "error" | "success";
  sourceMap: boolean;
  minify: boolean;
  outDir: string;
  rootDir: string;
  serversDir: string;
  watch: ResolvedWatchItem[];
  ignoreInitial: boolean;
  theme: Required<ThemeConfig>;
  download: Required<DownloadConfig>;
  upload: Required<UploadConfig>;
  hmr: Required<HmrConfig>;
}
