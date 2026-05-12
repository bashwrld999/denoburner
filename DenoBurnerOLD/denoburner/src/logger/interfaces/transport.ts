/**
 * Log Transport Interface
 * 
 * Strategy pattern for log output destinations.
 */

import type { LogEntry } from './types.ts';

/**
 * Log Transport
 * 
 * Handles outputting log entries to a specific destination.
 * Implementations: TuiTransport, ConsoleTransport, FileTransport
 */
export interface LogTransport {
  /** Unique transport name */
  readonly name: string;
  
  /**
   * Handle a log entry
   * @param entry - The log entry to process
   */
  log(entry: LogEntry): void | Promise<void>;
}
