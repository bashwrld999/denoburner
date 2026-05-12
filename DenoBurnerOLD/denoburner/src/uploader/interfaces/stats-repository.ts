/**
 * Stats Repository Interface
 * 
 * Repository pattern for tracking upload statistics.
 */

import type { UploadResult } from "../../types.ts";

/**
 * File info with RAM usage
 */
export interface FileInfo {
  /** Filename on server */
  filename: string;
  /** Server name */
  server: string;
  /** RAM usage in GB */
  ram: number;
}

/**
 * Last upload info
 */
export interface LastUpload {
  /** Filename */
  filename: string;
  /** Server name */
  server: string;
  /** RAM usage in GB */
  ram: number;
  /** Upload timestamp */
  timestamp: Date;
}

/**
 * Uploader Statistics
 */
export interface UploaderStats {
  /** Total files uploaded */
  filesUploaded: number;
  /** Total files watched */
  filesWatched: number;
  /** Total RAM usage in GB */
  totalRam: number;
  /** Last upload info */
  lastUpload: LastUpload | null;
  /** All files with their RAM usage */
  files: FileInfo[];
}

/**
 * Stats Repository
 * 
 * Manages upload statistics and file tracking.
 * Implementations can provide different storage backends:
 * - In-memory (default)
 * - File-based persistence
 * - Database
 */
export interface StatsRepository {
  /**
   * Get current statistics
   */
  getStats(): UploaderStats;

  /**
   * Record a successful upload
   * @param result - Upload result
   */
  recordUpload(result: UploadResult): void;

  /**
   * Record a file deletion
   * @param filename - Filename deleted
   * @param server - Server name
   */
  recordDelete(filename: string, server: string): void;

  /**
   * Set the number of files being watched
   * @param count - Number of files
   */
  setFilesWatched(count: number): void;

  /**
   * Reset all statistics
   */
  reset(): void;

  /**
   * Get files for a specific server
   * @param server - Server name
   */
  getFilesByServer(server: string): FileInfo[];

  /**
   * Get total RAM for a specific server
   * @param server - Server name
   */
  getRamByServer(server: string): number;
}
