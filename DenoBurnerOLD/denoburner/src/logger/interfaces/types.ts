/**
 * Logger Types
 * 
 * Type definitions for the centralized logging system.
 */

/**
 * Log levels supported by the logger
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

/**
 * Log entry structure
 */
export interface LogEntry {
  /** Log level */
  level: LogLevel;
  /** Formatted message */
  message: string;
  /** Category/module name */
  category: string;
  /** Timestamp */
  timestamp: Date;
  /** Raw arguments for custom formatting */
  args: unknown[];
}

/**
 * Log message for TUI display
 */
export interface LogMessage {
  /** Message text */
  text: string;
  /** Message type for coloring */
  type: LogLevel;
  /** Timestamp */
  timestamp: Date;
  /** Source name (category) */
  name: string;
}

/**
 * Logger options
 */
export interface LoggerOptions {
  /** Minimum log level to output */
  minLevel?: LogLevel;
  /** Default category when not specified */
  defaultCategory?: string;
}
