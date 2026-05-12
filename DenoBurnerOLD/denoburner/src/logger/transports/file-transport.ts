/**
 * File Transport
 * 
 * Transport that writes logs to a file.
 */

import type { LogTransport, LogEntry, LogLevel } from '../interfaces/index.ts';

/**
 * File Transport Options
 */
export interface FileTransportOptions {
  /** Path to the log file */
  filePath: string;
  /** Maximum file size in bytes before rotation (default: 5MB) */
  maxSize?: number;
  /** Number of backup files to keep (default: 3) */
  maxBackups?: number;
  /** Include timestamps in ISO format (default: true) */
  useIsoTimestamp?: boolean;
}

/**
 * File Transport
 * 
 * Writes logs to a file with optional rotation.
 */
export class FileTransport implements LogTransport {
  readonly name = 'file';
  private filePath: string;
  private maxSize: number;
  private maxBackups: number;
  private useIsoTimestamp: boolean;
  private currentSize: number = 0;
  private initialized: boolean = false;

  constructor(options: FileTransportOptions) {
    this.filePath = options.filePath;
    this.maxSize = options.maxSize ?? 5 * 1024 * 1024; // 5MB default
    this.maxBackups = options.maxBackups ?? 3;
    this.useIsoTimestamp = options.useIsoTimestamp ?? true;
  }

  async log(entry: LogEntry): Promise<void> {
    try {
      await this.ensureInitialized();
      
      const line = this.formatLine(entry);
      const data = new TextEncoder().encode(line + '\n');
      
      // Check if rotation is needed
      if (this.currentSize + data.length > this.maxSize) {
        await this.rotate();
      }
      
      // Append to file
      await Deno.writeFile(this.filePath, data, { append: true });
      this.currentSize += data.length;
    } catch (error) {
      // Don't let file errors crash the app
      console.error('FileTransport error:', error);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const stat = await Deno.stat(this.filePath);
      this.currentSize = stat.size;
    } catch {
      // File doesn't exist, will be created on first write
      this.currentSize = 0;
    }
    
    this.initialized = true;
  }

  private async rotate(): Promise<void> {
    // Delete oldest backup if exists
    const oldestBackup = `${this.filePath}.${this.maxBackups}`;
    try {
      await Deno.remove(oldestBackup);
    } catch {
      // File doesn't exist, ignore
    }

    // Rotate existing backups
    for (let i = this.maxBackups - 1; i >= 1; i--) {
      const oldPath = `${this.filePath}.${i}`;
      const newPath = `${this.filePath}.${i + 1}`;
      try {
        await Deno.rename(oldPath, newPath);
      } catch {
        // File doesn't exist, ignore
      }
    }

    // Rename current file to .1
    try {
      await Deno.rename(this.filePath, `${this.filePath}.1`);
    } catch {
      // File doesn't exist, ignore
    }

    this.currentSize = 0;
  }

  private formatLine(entry: LogEntry): string {
    const timestamp = this.useIsoTimestamp
      ? entry.timestamp.toISOString()
      : this.formatTime(entry.timestamp);
    const level = entry.level.toUpperCase().padEnd(7);
    
    return `${timestamp} ${level} [${entry.category}] ${entry.message}`;
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
 * Create a file transport
 */
export function createFileTransport(options: FileTransportOptions): LogTransport {
  return new FileTransport(options);
}
