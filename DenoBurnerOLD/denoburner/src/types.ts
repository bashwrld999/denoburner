/**
 * Core types for denoburner
 */

import type { ResolvedWatchItem } from "./config/types.ts";
import type { BundleMode } from "./bundler/types.ts";

/**
 * File system event types
 */
export type FileEvent = "create" | "modify" | "delete";

/**
 * HMR data passed when a file changes
 */
export interface HmrData {
  /** File path relative to project root */
  file: string;
  /** Event type: create, modify, or delete */
  event: FileEvent;
  /** Timestamp of the event */
  timestamp: number;
  /** Glob pattern that matched this file */
  pattern: string;
  /** Whether to transform/bundle this file */
  transform: boolean;
  /** Bundle mode */
  bundle: BundleMode;
  /** Whether to transpile TypeScript to JavaScript when bundling */
  transpile: boolean;
  /** Function to resolve output locations */
  location: (file: string) => Array<{ filename: string; server: string }>;
  /** Only for cascading updates, don't upload this file */
  cascadeOnly?: boolean;
}

/**
 * Upload result
 */
export interface UploadResult {
  /** Source file path (relative to project root) */
  sourceFile: string;
  /** Output filename */
  filename: string;
  /** Server name */
  server: string;
  /** Whether upload was successful */
  success: boolean;
  /** Uploaded content (for caching) */
  content?: string;
  /** RAM usage in GB */
  ramUsage?: number;
  /** Whether the file was bundled */
  bundled?: boolean;
  /** Number of bundled dependencies */
  bundledDeps?: number;
  /** Error if upload failed */
  error?: Error;
}

/**
 * File info for stats display
 */
export interface FileInfo {
  /** Filename */
  filename: string;
  /** Server name */
  server: string;
  /** RAM usage in GB */
  ram: number;
}
