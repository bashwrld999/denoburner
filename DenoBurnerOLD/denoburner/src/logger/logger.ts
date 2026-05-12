/**
 * Logger Implementation
 * 
 * Main logger with console-like API and transport support.
 */

import type { Logger, CategoryLogger, ArgumentFormatter, LogTransport, LogLevel, LogEntry, LoggerOptions } from './interfaces/index.ts';
import { DefaultFormatter } from './formatter.ts';

/**
 * Log level priority for filtering
 */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  success: 3,
};

/**
 * DenoBurner Logger
 * 
 * Main logger implementation with:
 * - Console-like API (multiple arguments)
 * - Multiple transports (TUI, Console, File)
 * - Log level filtering
 * - Category loggers
 */
export class DenoBurnerLogger implements Logger {
  private transports: LogTransport[] = [];
  private minLevel: LogLevel = 'debug';
  private formatter: ArgumentFormatter;
  private defaultCategory: string;

  constructor(options?: LoggerOptions) {
    if (options?.minLevel) {
      this.minLevel = options.minLevel;
    }
    this.defaultCategory = options?.defaultCategory ?? 'App';
    this.formatter = new DefaultFormatter();
  }

  debug(...args: unknown[]): void {
    this.log('debug', args);
  }

  info(...args: unknown[]): void {
    this.log('info', args);
  }

  warn(...args: unknown[]): void {
    this.log('warn', args);
  }

  error(...args: unknown[]): void {
    this.log('error', args);
  }

  success(...args: unknown[]): void {
    this.log('success', args);
  }

  child(category: string): CategoryLogger {
    return {
      debug: (...args: unknown[]) => this.log('debug', args, category),
      info: (...args: unknown[]) => this.log('info', args, category),
      warn: (...args: unknown[]) => this.log('warn', args, category),
      error: (...args: unknown[]) => this.log('error', args, category),
      success: (...args: unknown[]) => this.log('success', args, category),
    };
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  removeTransport(name: string): void {
    this.transports = this.transports.filter(t => t.name !== name);
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  getLevel(): LogLevel {
    return this.minLevel;
  }

  private log(level: LogLevel, args: unknown[], category?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message: this.formatter.format(args),
      category: category ?? this.defaultCategory,
      timestamp: new Date(),
      args,
    };

    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch (error) {
        // Don't let transport errors crash the app
        console.error(`Logger transport "${transport.name}" error:`, error);
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.minLevel];
  }
}

// Global logger instance
let globalLogger: Logger | null = null;

/**
 * Get the global logger instance
 * Creates a new logger with ConsoleTransport if not already set
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new DenoBurnerLogger();
  }
  return globalLogger;
}

/**
 * Set the global logger instance
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * Create a category logger
 * @param category - The category name for all logs from this logger
 */
export function createLogger(category: string): CategoryLogger {
  return getLogger().child(category);
}

/**
 * Create a new logger instance with options
 */
export function createLoggerInstance(options?: LoggerOptions): Logger {
  return new DenoBurnerLogger(options);
}
