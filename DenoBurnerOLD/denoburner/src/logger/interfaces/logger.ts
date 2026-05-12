/**
 * Logger Interface
 * 
 * Main logger interface with console-like API.
 */

import type { LogLevel, LoggerOptions } from './types.ts';
import type { LogTransport } from './transport.ts';

/**
 * Category Logger
 * 
 * A logger with a fixed category for convenient logging.
 */
export interface CategoryLogger {
  /** Log debug message */
  debug(...args: unknown[]): void;
  /** Log info message */
  info(...args: unknown[]): void;
  /** Log warning message */
  warn(...args: unknown[]): void;
  /** Log error message */
  error(...args: unknown[]): void;
  /** Log success message */
  success(...args: unknown[]): void;
}

/**
 * Logger
 * 
 * Main logger interface with console-like API.
 * Supports multiple arguments like console.log.
 */
export interface Logger {
  /** Log debug message */
  debug(...args: unknown[]): void;
  /** Log info message */
  info(...args: unknown[]): void;
  /** Log warning message */
  warn(...args: unknown[]): void;
  /** Log error message */
  error(...args: unknown[]): void;
  /** Log success message */
  success(...args: unknown[]): void;
  
  /**
   * Create a child logger with a fixed category
   * @param category - The category name for all logs from this logger
   */
  child(category: string): CategoryLogger;
  
  /**
   * Add a transport
   * @param transport - The transport to add
   */
  addTransport(transport: LogTransport): void;
  
  /**
   * Remove a transport by name
   * @param name - The transport name to remove
   */
  removeTransport(name: string): void;
  
  /**
   * Set the minimum log level
   * @param level - The minimum level to log
   */
  setLevel(level: LogLevel): void;
  
  /**
   * Get the current log level
   */
  getLevel(): LogLevel;
}
