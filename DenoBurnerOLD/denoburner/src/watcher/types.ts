/**
 * Watcher Types
 * 
 * Core type definitions for the watcher system.
 */

import type { ResolvedWatchItem } from "../config/types.ts";
import type { BundleMode } from "../bundler/types.ts";
import type { FileEvent } from "../types.ts";

/**
 * Raw file system event from watcher
 */
export interface FileWatchEvent {
  /** Event kind */
  kind: FileEvent;
  /** Affected file paths */
  paths: string[];
  /** Event timestamp */
  timestamp: number;
}

/**
 * Processed file information
 */
export interface ProcessedFile {
  /** File path (relative to cwd) */
  path: string;
  /** Event kind */
  event: FileEvent;
  /** Matched watch item configuration */
  watchItem: ResolvedWatchItem;
  /** File content (if available) */
  content?: string;
  /** File hash */
  hash?: string;
  /** Dependencies (if analyzed) */
  dependencies?: string[];
  /** Custom metadata */
  metadata?: Map<string, unknown>;
}

/**
 * HMR data for file changes
 */
export interface HmrData {
  /** File path */
  file: string;
  /** Event kind */
  event: FileEvent;
  /** Timestamp */
  timestamp: number;
  /** Matched pattern */
  pattern: string;
  /** Whether to transform */
  transform: boolean;
  /** Bundle mode */
  bundle: BundleMode;
  /** Whether to transpile */
  transpile: boolean;
  /** Location resolver */
  location: (file: string) => Array<{ filename: string; server: string }>;
  /** Only for cascading updates, don't upload */
  cascadeOnly?: boolean;
}

/**
 * Watcher context passed through processor chain
 */
export interface WatcherContext {
  /** Original file system event */
  event: FileWatchEvent;
  /** Processed files */
  files: ProcessedFile[];
  /** Shared metadata across processors */
  metadata: Map<string, unknown>;
  /** Timestamp when processing started */
  startedAt: number;
}

/**
 * File information for repository
 */
export interface FileInfo {
  /** File path */
  path: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  modified: number;
  /** Content hash */
  hash?: string;
  /** Detected dependencies */
  dependencies?: string[];
  /** Watch item that matches this file */
  watchItem?: ResolvedWatchItem;
}

/**
 * Watcher statistics
 */
export interface WatcherStats {
  /** Number of files being watched */
  filesWatched: number;
  /** Number of events processed */
  eventsProcessed: number;
  /** Number of files uploaded */
  filesUploaded: number;
  /** Last event timestamp */
  lastEvent?: Date;
  /** Watcher start time */
  startedAt?: Date;
}

/**
 * Watcher options
 */
export interface WatcherOptions {
  /** Watch patterns configuration */
  patterns: ResolvedWatchItem[];
  /** Debounce delay in milliseconds */
  debounceDelay?: number;
  /** Enable batching */
  batchEnabled?: boolean;
  /** Maximum batch size */
  batchMaxSize?: number;
  /** Batch timeout in milliseconds */
  batchTimeout?: number;
  /** Enable file caching */
  cacheEnabled?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtl?: number;
}

/**
 * Processor result
 */
export type ProcessorResult = 
  | { continue: true }
  | { continue: false; reason: string };
