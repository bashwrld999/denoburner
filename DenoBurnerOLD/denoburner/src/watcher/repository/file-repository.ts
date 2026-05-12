/**
 * File Repository
 * 
 * In-memory implementation of file metadata storage.
 */

import type { FileRepository } from "../interfaces/index.ts";
import type { FileInfo } from "../types.ts";
import type { ResolvedWatchItem } from "../../config/types.ts";
import { globToRegExp } from "jsr:@std/path/posix";

/**
 * Check if a file matches a glob pattern
 */
function matchesPattern(file: string, pattern: string): boolean {
  const regex = globToRegExp(pattern, { extended: true, globstar: true });
  const normalized = file.replaceAll("\\", "/");
  return regex.test(normalized);
}

/**
 * File Repository implementation
 * 
 * Stores file metadata in memory with optional caching.
 */
export class FileRepositoryImpl implements FileRepository {
  private files: Map<string, FileInfo> = new Map();
  
  async get(path: string): Promise<FileInfo | undefined> {
    return this.files.get(path);
  }
  
  async getAll(): Promise<FileInfo[]> {
    return Array.from(this.files.values());
  }
  
  async set(path: string, info: FileInfo): Promise<void> {
    this.files.set(path, info);
  }
  
  async delete(path: string): Promise<void> {
    this.files.delete(path);
  }
  
  async has(path: string): Promise<boolean> {
    return this.files.has(path);
  }
  
  async clear(): Promise<void> {
    this.files.clear();
  }
  
  async getByWatchItem(watchItem: ResolvedWatchItem): Promise<FileInfo[]> {
    const results: FileInfo[] = [];
    
    for (const info of this.files.values()) {
      if (matchesPattern(info.path, watchItem.pattern)) {
        results.push(info);
      }
    }
    
    return results;
  }
  
  async size(): Promise<number> {
    return this.files.size;
  }
  
  async refresh(path: string): Promise<FileInfo | undefined> {
    try {
      const stat = await Deno.stat(path);
      
      const info: FileInfo = {
        path,
        size: stat.size,
        modified: stat.mtime?.getTime() ?? 0,
      };
      
      this.files.set(path, info);
      return info;
    } catch {
      // File doesn't exist or can't be accessed
      this.files.delete(path);
      return undefined;
    }
  }
  
  /**
   * Get all file paths
   */
  getPaths(): string[] {
    return Array.from(this.files.keys());
  }
  
  /**
   * Check if a file has changed (by comparing modified time)
   */
  async hasChanged(path: string): Promise<boolean> {
    const existing = this.files.get(path);
    if (!existing) return true;
    
    try {
      const stat = await Deno.stat(path);
      return stat.mtime?.getTime() !== existing.modified;
    } catch {
      return true;
    }
  }
}

/**
 * Create a new file repository
 */
export function createFileRepository(): FileRepository {
  return new FileRepositoryImpl();
}
