/**
 * File Cache
 * 
 * Content-based caching to skip unchanged files.
 */

import type { TrackedFile } from "./types.ts";

/**
 * Cache entry for a file
 */
interface CacheEntry {
  /** Content hash */
  hash: string;
  /** Last upload timestamp */
  lastUploaded: Date;
  /** File size in bytes */
  size: number;
  /** Server uploaded to */
  server: string;
  /** Output filename */
  filename: string;
}

/**
 * Hash algorithm options
 */
type HashAlgorithm = "sha256" | "sha1" | "md5";

/**
 * File Cache
 * 
 * Tracks file content hashes to avoid re-uploading unchanged files.
 */
export class FileCache {
  private cache = new Map<string, CacheEntry>();
  private algorithm: HashAlgorithm = "sha256";

  /**
   * Check if a file needs to be uploaded
   */
  async needsUpload(
    filePath: string,
    server: string,
    filename: string,
  ): Promise<boolean> {
    const key = this.getKey(filePath, server);
    const entry = this.cache.get(key);

    if (!entry) {
      return true;
    }

    // Check if file still exists and get current hash
    try {
      const content = await Deno.readTextFile(filePath);
      const currentHash = await this.hash(content);
      return currentHash !== entry.hash;
    } catch {
      // File doesn't exist or can't be read
      return false;
    }
  }

  /**
   * Check if content has changed
   */
  async hasContentChanged(
    filePath: string,
    server: string,
    content: string,
  ): Promise<boolean> {
    const key = this.getKey(filePath, server);
    const entry = this.cache.get(key);

    if (!entry) {
      return true;
    }

    const currentHash = await this.hash(content);
    return currentHash !== entry.hash;
  }

  /**
   * Mark a file as uploaded
   */
  async markUploaded(
    filePath: string,
    server: string,
    filename: string,
    content: string,
  ): Promise<void> {
    const key = this.getKey(filePath, server);
    const hash = await this.hash(content);

    this.cache.set(key, {
      hash,
      lastUploaded: new Date(),
      size: content.length,
      server,
      filename,
    });
  }

  /**
   * Mark uploaded with pre-computed hash
   */
  markUploadedWithHash(
    filePath: string,
    server: string,
    filename: string,
    hash: string,
    size: number,
  ): void {
    const key = this.getKey(filePath, server);

    this.cache.set(key, {
      hash,
      lastUploaded: new Date(),
      size,
      server,
      filename,
    });
  }

  /**
   * Remove a file from cache
   */
  remove(filePath: string, server: string): boolean {
    const key = this.getKey(filePath, server);
    return this.cache.delete(key);
  }

  /**
   * Get cached file info
   */
  get(filePath: string, server: string): CacheEntry | undefined {
    const key = this.getKey(filePath, server);
    return this.cache.get(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get all cached entries
   */
  getAll(): Map<string, CacheEntry> {
    return new Map(this.cache);
  }

  /**
   * Cascade-only file hash cache (files outside servers dir)
   */
  private cascadeOnlyHashes = new Map<string, string>();

  /**
   * Check if a cascade-only file's content has changed
   * Returns true if the file is new or content has changed
   */
  async hasCascadeOnlyFileChanged(filePath: string): Promise<boolean> {
    try {
      const content = await Deno.readTextFile(filePath);
      const currentHash = await this.hash(content);
      const previousHash = this.cascadeOnlyHashes.get(filePath);
      
      console.log(`[FileCache] hasCascadeOnlyFileChanged: ${filePath}`);
      console.log(`[FileCache]   currentHash: ${currentHash.slice(0, 8)}...`);
      console.log(`[FileCache]   previousHash: ${previousHash?.slice(0, 8) ?? 'none'}...`);
      
      if (!previousHash) {
        // First time seeing this file, track it
        this.cascadeOnlyHashes.set(filePath, currentHash);
        console.log(`[FileCache]   result: true (first time)`);
        return true;
      }
      
      if (currentHash !== previousHash) {
        // Content changed, update tracked hash
        this.cascadeOnlyHashes.set(filePath, currentHash);
        console.log(`[FileCache]   result: true (content changed)`);
        return true;
      }
      
      console.log(`[FileCache]   result: false (unchanged)`);
      return false;
    } catch (e) {
      // File doesn't exist or can't be read
      console.log(`[FileCache]   result: false (error: ${e})`);
      return false;
    }
  }

  /**
   * Set the hash for a cascade-only file (used during initial scan)
   */
  setCascadeOnlyHash(filePath: string, hash: string): void {
    this.cascadeOnlyHashes.set(filePath, hash);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    totalSize: number;
    oldestUpload?: Date;
    newestUpload?: Date;
  } {
    let totalSize = 0;
    let oldestUpload: Date | undefined;
    let newestUpload: Date | undefined;

    for (const entry of this.cache.values()) {
      totalSize += entry.size;
      
      if (!oldestUpload || entry.lastUploaded < oldestUpload) {
        oldestUpload = entry.lastUploaded;
      }
      if (!newestUpload || entry.lastUploaded > newestUpload) {
        newestUpload = entry.lastUploaded;
      }
    }

    return {
      entries: this.cache.size,
      totalSize,
      oldestUpload,
      newestUpload,
    };
  }

  /**
   * Compute hash of content
   */
  async hash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    const hashBuffer = await crypto.subtle.digest(
      this.algorithm.toUpperCase().replace("SHA", "SHA-"),
      data,
    );
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Generate cache key
   */
  private getKey(filePath: string, server: string): string {
    return `${server}:${filePath}`;
  }
}

/**
 * Create a file cache instance
 */
export function createFileCache(): FileCache {
  return new FileCache();
}
