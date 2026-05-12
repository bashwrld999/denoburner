/**
 * Analysis Cache Interface
 * 
 * Repository pattern for caching analysis results.
 */

import type { DependencyInfo } from "../types.ts";

/**
 * Cache entry with metadata
 */
export interface CacheEntry {
  /** The cached dependency info */
  info: DependencyInfo;
  /** File modification time when cached */
  mtime: number;
  /** When the entry was cached */
  timestamp: number;
}

/**
 * Analysis Cache Interface
 * 
 * Defines the contract for caching dependency analysis results.
 * Implementations can use in-memory storage, files, etc.
 */
export interface AnalysisCache {
  /**
   * Get cached analysis for a file
   * @param filePath - Absolute file path
   * @returns Cached dependency info, or undefined if not cached
   */
  get(filePath: string): DependencyInfo | undefined;

  /**
   * Get full cache entry including metadata
   * @param filePath - Absolute file path
   * @returns Cache entry, or undefined if not cached
   */
  getEntry(filePath: string): CacheEntry | undefined;

  /**
   * Cache analysis result for a file
   * @param filePath - Absolute file path
   * @param info - Dependency info to cache
   * @param mtime - File modification time
   */
  set(filePath: string, info: DependencyInfo, mtime?: number): void;

  /**
   * Check if a file is cached and still valid
   * @param filePath - Absolute file path
   * @param currentMtime - Current file modification time
   * @returns True if cache is valid
   */
  isValid(filePath: string, currentMtime: number): boolean;

  /**
   * Invalidate cache for a file
   * @param filePath - Absolute file path
   */
  invalidate(filePath: string): void;

  /**
   * Invalidate all cached entries
   */
  clear(): void;

  /**
   * Get number of cached entries
   */
  size(): number;
}
