/**
 * Console Transport
 * 
 * Transport that outputs logs to the console with colors.
 */

import type { LogTransport, LogEntry, LogLevel } from '../interfaces/index.ts';

/**
 * ANSI color codes for log levels
 */
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',   // Gray
  info: '\x1b[37m',    // White
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  success: '\x1b[32m', // Green
};

const CATEGORY_COLOR = '\x1b[36m';  // Cyan
const TIME_COLOR = '\x1b[90m';      // Gray
const RESET = '\x1b[0m';

/**
 * Console Transport
 * 
 * Outputs formatted logs to the console with ANSI colors.
 * Used as fallback when TUI is not available.
 */
export class ConsoleTransport implements LogTransport {
  readonly name = 'console';
  private useColors: boolean;

  constructor(options?: { useColors?: boolean }) {
    this.useColors = options?.useColors ?? true;
  }

  log(entry: LogEntry): void {
    const time = this.formatTime(entry.timestamp);
    const level = entry.level.toUpperCase().padEnd(7);
    const category = entry.category;

    if (this.useColors) {
      const levelColor = LEVEL_COLORS[entry.level];
      console.log(
        `${TIME_COLOR}${time}${RESET} ${levelColor}${level}${RESET} ${CATEGORY_COLOR}[${category}]${RESET} ${entry.message}`
      );
    } else {
      console.log(`${time} ${level} [${category}] ${entry.message}`);
    }
  }

  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }
}

/**
 * Create a console transport
 */
export function createConsoleTransport(options?: { useColors?: boolean }): LogTransport {
  return new ConsoleTransport(options);
}
