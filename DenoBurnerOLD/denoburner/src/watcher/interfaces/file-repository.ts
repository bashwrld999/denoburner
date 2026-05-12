/**
 * File Repository Interface
 * 
 * Repository pattern for file metadata storage and caching.
 */

import type { FileInfo } from "../types.ts";
import type { ResolvedWatchItem } from "../../config/types.ts";

/**
 * File Repository interface
 * 
 * Provides storage and retrieval of file metadata.
 * Implementations can add caching, persistence, etc.
 * 
 * @example
 * ```ts
 * class CachedFileRepository implements FileRepository {
 *   private cache = new Map<string, FileInfo>();
 *   
 *   async get(path: string) {
 *     return this.cache.get(path);
 *   }
 *   // ...
 * }
 * ```
 */
export interface FileRepository {
  /**
   * Get file info by path
   * @param path File path
   * @returns File info or undefined if not found
   */
  get(path: string): Promise<FileInfo | undefined>;
  
  /**
   * Get all file infos
   * @returns Array of all file infos
   */
  getAll(): Promise<FileInfo[]>;
  
  /**
   * Set file info
   * @param path File path
   * @param info File info to store
   */
  set(path: string, info: FileInfo): Promise<void>;
  
  /**
   * Delete file info
   * @param path File path to delete
   */
  delete(path: string): Promise<void>;
  
  /**
   * Check if file exists in repository
   * @param path File path
   */
  has(path: string): Promise<boolean>;
  
  /**
   * Clear all file infos
   */
  clear(): Promise<void>;
  
  /**
   * Get all files matching a watch item
   * @param watchItem Watch item to match
   */
  getByWatchItem(watchItem: ResolvedWatchItem): Promise<FileInfo[]>;
  
  /**
   * Get total number of files
   */
  size(): Promise<number>;
  
  /**
   * Update file stats (size, modified, hash)
   * @param path File path
   */
  refresh(path: string): Promise<FileInfo | undefined>;
}
