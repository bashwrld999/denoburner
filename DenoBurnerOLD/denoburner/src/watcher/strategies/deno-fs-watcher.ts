/**
 * Deno File System Watcher
 * 
 * Strategy implementation using Deno.watchFs API.
 */

import type { FileWatcher, FileWatchCallback } from "../interfaces/index.ts";
import type { FileWatchEvent } from "../types.ts";
import type { FileEvent } from "../../types.ts";

/**
 * Events to watch for
 */
const WATCHED_EVENTS: Set<Deno.FsEvent["kind"]> = new Set([
  "create",
  "modify",
  "remove",
]);

/**
 * Map Deno event kinds to our FileEvent type
 * Note: Deno uses "remove" but we use "delete" for consistency
 */
function mapEventKind(kind: Deno.FsEvent["kind"]): FileEvent | null {
  if (kind === "create" || kind === "modify") {
    return kind;
  }
  if (kind === "remove") {
    return "delete";
  }
  return null;
}

/**
 * Deno File System Watcher
 * 
 * Uses Deno.watchFs for efficient file system watching.
 */
export class DenoFsWatcher implements FileWatcher {
  private baseDir: string;
  private watcher?: Deno.FsWatcher;
  private callbacks: Set<FileWatchCallback> = new Set();
  private running = false;
  private abortController?: AbortController;
  
  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }
  
  async start(): Promise<void> {
    if (this.running) return;
    
    this.running = true;
    this.abortController = new AbortController();
    
    try {
      this.watcher = Deno.watchFs(this.baseDir, { recursive: true });
      
      for await (const event of this.watcher) {
        if (!this.running) break;
        
        // Filter to only watched events
        if (!WATCHED_EVENTS.has(event.kind)) continue;
        
        const kind = mapEventKind(event.kind);
        if (!kind) continue;
        
        const watchEvent: FileWatchEvent = {
          kind,
          paths: event.paths,
          timestamp: Date.now(),
        };
        
        // Notify all callbacks
        for (const callback of this.callbacks) {
          try {
            callback(watchEvent);
          } catch (error) {
            console.error("Error in file watch callback:", error);
          }
        }
      }
    } catch (error) {
      if (this.running) {
        console.error("File watcher error:", error);
      }
    }
  }
  
  stop(): void {
    this.running = false;
    this.abortController?.abort();
    
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
  }
  
  isRunning(): boolean {
    return this.running;
  }
  
  onEvent(callback: FileWatchCallback): void {
    this.callbacks.add(callback);
  }
  
  offEvent(callback: FileWatchCallback): void {
    this.callbacks.delete(callback);
  }
  
  getBaseDir(): string {
    return this.baseDir;
  }
}
