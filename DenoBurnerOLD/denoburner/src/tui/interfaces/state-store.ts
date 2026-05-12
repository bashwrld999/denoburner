/**
 * TUI State Store Interface
 * 
 * Observer pattern for state management in the TUI.
 */

import type { LogEntry, LogLevel } from "../../logger/interfaces/index.ts";
import type { TuiStats } from "./event-bus.ts";

/**
 * Queue item for pending uploads
 */
export interface QueueItem {
  file: string;
  server: string;
  timestamp: number;
}

/**
 * TUI State shape
 */
export interface TuiState {
  /** Connection state */
  connection: {
    connected: boolean;
    port: number;
    /** When connection was established (for duration calculation) */
    connectedAt?: Date;
  };
  /** File statistics */
  files: {
    watched: number;
    uploaded: number;
    totalRam: number;
    lastUpload: TuiStats["lastUpload"];
    list: TuiStats["files"];
    /** Upload success count */
    successCount: number;
    /** Upload error count */
    errorCount: number;
    /** Upload skipped count (unchanged files) */
    skippedCount: number;
  };
  /** Queue state */
  queue: {
    /** Number of pending uploads */
    pending: number;
    /** Queue items */
    items: QueueItem[];
  };
  /** Console logs */
  logs: LogEntry[];
  /** UI state */
  ui: {
    width: number;
    height: number;
    running: boolean;
    /** Expanded server sections in file list */
    expandedServers: string[];
    /** Log level filter for console */
    logLevelFilter: LogLevel | "all";
  };
}

/**
 * State subscriber callback
 */
export type StateSubscriber = (state: TuiState, changedKeys: string[]) => void;

/**
 * State Store Interface
 * 
 * Provides reactive state management for TUI components.
 */
export interface StateStore {
  /**
   * Get the current state
   */
  getState(): TuiState;

  /**
   * Update state with partial changes
   */
  setState(partial: Partial<TuiState>): void;

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  subscribe(subscriber: StateSubscriber): () => void;

  /**
   * Select a specific part of state
   */
  select<R>(selector: (state: TuiState) => R): R;

  /**
   * Reset state to initial values
   */
  reset(): void;
}
