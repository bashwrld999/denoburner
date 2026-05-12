/**
 * TUI Transport
 * 
 * Transport that sends logs to the TUI console panel.
 */

import type { LogTransport, LogEntry, LogLevel } from '../interfaces/index.ts';

/**
 * ANSI color codes for log levels (for TUI rendering)
 */
export const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',   // Gray
  info: '\x1b[37m',    // White
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  success: '\x1b[32m', // Green
};

export const CATEGORY_COLOR = '\x1b[36m';  // Cyan
export const TIME_COLOR = '\x1b[90m';      // Gray
export const RESET = '\x1b[0m';

/**
 * Log entry handler type
 */
export type LogEntryHandler = (entry: LogEntry) => void;

/**
 * TUI Transport
 * 
 * Sends logs to the TUI console panel via a handler function.
 * This allows the TUI to receive logs and display them in the console panel.
 */
export class TuiTransport implements LogTransport {
  readonly name = 'tui';
  private handler: LogEntryHandler;

  constructor(handler: LogEntryHandler) {
    this.handler = handler;
  }

  log(entry: LogEntry): void {
    this.handler(entry);
  }

  /**
   * Update the handler (useful for reconfiguring)
   */
  setHandler(handler: LogEntryHandler): void {
    this.handler = handler;
  }
}

/**
 * Create a TUI transport with a handler
 */
export function createTuiTransport(handler: LogEntryHandler): LogTransport {
  return new TuiTransport(handler);
}

/**
 * Format a log entry for TUI display with colors
 */
export function formatLogEntry(entry: LogEntry): string {
  const time = formatTime(entry.timestamp);
  const level = entry.level.toUpperCase().padEnd(7);
  const levelColor = LEVEL_COLORS[entry.level];
  
  return `${TIME_COLOR}${time}${RESET} ${levelColor}${level}${RESET} ${CATEGORY_COLOR}[${entry.category}]${RESET} ${entry.message}`;
}

/**
 * Format a log entry for TUI display without colors (for plain text)
 */
export function formatLogEntryPlain(entry: LogEntry): string {
  const time = formatTime(entry.timestamp);
  const level = entry.level.toUpperCase().padEnd(7);
  
  return `${time} ${level} [${entry.category}] ${entry.message}`;
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}
