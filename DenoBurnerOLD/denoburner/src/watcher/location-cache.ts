/**
 * Location Cache
 * 
 * Pre-resolves file locations to avoid repeated function calls during HMR events.
 * Caches the mapping from source file to target locations (filename + server).
 */

import type { ResolvedWatchItem } from "../config/types.ts";

/**
 * A resolved file location with all information needed for upload
 */
export interface ResolvedFileLocation {
  /** Source file path (relative to cwd) */
  sourcePath: string;
  /** Target filename in Bitburner */
  filename: string;
  /** Target server in Bitburner */
  server: string;
  /** The watch item that matched this file */
  watchItem: ResolvedWatchItem;
}

/**
 * Location cache options
 */
export interface LocationCacheOptions {
  /** Maximum cache size (default: 10000) */
  maxSize?: number;
}

/**
 * Location Cache
 * 
 * Caches resolved file locations for quick lookup during HMR events.
 * Thread-safe for single-threaded Deno runtime.
 */
export class LocationCache {
  private cache = new Map<string, ResolvedFileLocation[]>();
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(options: LocationCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 10000;
  }

  /**
   * Resolve file locations, using cache if available
   * 
   * @param file Source file path
   * @param watchItem Watch item configuration (used if not cached)
   * @returns Array of resolved locations
   */
  resolve(file: string, watchItem: ResolvedWatchItem): ResolvedFileLocation[] {
    const cached = this.cache.get(file);
    
    if (cached) {
      this.hits++;
      return cached;
    }
    
    this.misses++;
    
    // Resolve locations from watch item
    const locations = watchItem.location(file).map((loc) => ({
      sourcePath: file,
      filename: loc.filename,
      server: loc.server,
      watchItem,
    }));
    
    // Cache the result
    this.set(file, locations);
    
    return locations;
  }

  /**
   * Get cached locations without resolving
   * 
   * @param file Source file path
   * @returns Cached locations or undefined
   */
  get(file: string): ResolvedFileLocation[] | undefined {
    return this.cache.get(file);
  }

  /**
   * Set cached locations
   * 
   * @param file Source file path
   * @param locations Resolved locations
   */
  set(file: string, locations: ResolvedFileLocation[]): void {
    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.maxSize && !this.cache.has(file)) {
      // Remove first entry (oldest)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(file, locations);
  }

  /**
   * Invalidate cached location for a file
   * 
   * @param file Source file path
   */
  invalidate(file: string): void {
    this.cache.delete(file);
  }

  /**
   * Invalidate all cached locations matching a pattern
   * 
   * @param pattern Glob pattern to match
   */
  invalidatePattern(pattern: string): void {
    // Convert glob to regex for matching
    const regex = this.globToRegex(pattern);
    
    for (const file of this.cache.keys()) {
      if (regex.test(file)) {
        this.cache.delete(file);
      }
    }
  }

  /**
   * Clear all cached locations
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Get all cached files
   */
  getCachedFiles(): string[] {
    return [...this.cache.keys()];
  }

  /**
   * Check if a file is cached
   */
  has(file: string): boolean {
    return this.cache.has(file);
  }

  /**
   * Convert glob pattern to regex
   */
  private globToRegex(pattern: string): RegExp {
    // Simple glob to regex conversion
    let regex = pattern
      .replace(/\*\*/g, "<<<GLOBSTAR>>>")
      .replace(/\*/g, "[^/]*")
      .replace(/<<<GLOBSTAR>>>/g, ".*")
      .replace(/\?/g, "[^/]")
      .replace(/\./g, "\\.");
    
    // Ensure it matches from start
    if (!regex.startsWith("^")) {
      regex = "^" + regex;
    }
    
    // Ensure it matches to end
    if (!regex.endsWith("$")) {
      regex = regex + "$";
    }
    
    return new RegExp(regex);
  }
}

/**
 * Create a location cache instance
 */
export function createLocationCache(options?: LocationCacheOptions): LocationCache {
  return new LocationCache(options);
}
