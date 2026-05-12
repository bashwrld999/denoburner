/**
 * In-Memory Analysis Cache
 * 
 * Simple in-memory cache for analysis results.
 */

import type { AnalysisCache, CacheEntry } from "../interfaces/analysis-cache.ts";
import type { DependencyInfo } from "../types.ts";

/**
 * In-Memory Analysis Cache
 * 
 * Caches dependency analysis results in memory.
 * Uses file modification time to validate cache entries.
 */
export class InMemoryAnalysisCache implements AnalysisCache {
  private cache = new Map<string, CacheEntry>();

  /**
   * Get cached analysis for a file
   */
  get(filePath: string): DependencyInfo | undefined {
    return this.cache.get(filePath)?.info;
  }

  /**
   * Get full cache entry including metadata
   */
  getEntry(filePath: string): CacheEntry | undefined {
    return this.cache.get(filePath);
  }

  /**
   * Cache analysis result for a file
   */
  set(filePath: string, info: DependencyInfo, mtime?: number): void {
    this.cache.set(filePath, {
      info,
      mtime: mtime ?? Date.now(),
      timestamp: Date.now(),
    });
  }

  /**
   * Check if a file is cached and still valid
   */
  isValid(filePath: string, currentMtime: number): boolean {
    const entry = this.cache.get(filePath);
    if (!entry) return false;
    return entry.mtime >= currentMtime;
  }

  /**
   * Invalidate cache for a file
   */
  invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }

  /**
   * Invalidate all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get number of cached entries
   */
  size(): number {
    return this.cache.size;
  }
}
