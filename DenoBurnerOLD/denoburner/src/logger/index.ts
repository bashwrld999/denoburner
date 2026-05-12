/**
 * Logger Module
 * 
 * Centralized logging system with multiple transports.
 * 
 * @example
 * ```typescript
 * import { getLogger, createLogger, createTuiTransport, createConsoleTransport } from './logger/index.ts';
 * 
 * // Get the global logger
 * const logger = getLogger();
 * 
 * // Add transports
 * logger.addTransport(createConsoleTransport());
 * 
 * // Create a category logger
 * const log = createLogger('Watcher');
 * log.info('Watching for changes...');
 * log.error('Failed to read file:', error);
 * log.success('File uploaded:', filename);
 * ```
 */

// Interfaces
export type { LogLevel, LogEntry, LoggerOptions } from './interfaces/types.ts';
export type { LogTransport } from './interfaces/transport.ts';
export type { Logger, CategoryLogger } from './interfaces/logger.ts';
export type { ArgumentFormatter } from './interfaces/formatter.ts';

// Formatter
export { DefaultFormatter, CompactFormatter } from './formatter.ts';

// Logger
export { DenoBurnerLogger, getLogger, setLogger, createLogger, createLoggerInstance } from './logger.ts';

// Transports
export {
  ConsoleTransport,
  createConsoleTransport,
  TuiTransport,
  createTuiTransport,
  formatLogEntry,
  formatLogEntryPlain,
  LEVEL_COLORS,
  CATEGORY_COLOR,
  TIME_COLOR,
  RESET,
  FileTransport,
  createFileTransport,
  type FileTransportOptions,
} from './transports/index.ts';
