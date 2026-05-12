/**
 * Config file watcher
 * 
 * Watches config file for changes and emits events.
 */

import { EventEmitter } from "../core/event-emitter.ts";

/**
 * Config watcher events
 */
export interface ConfigWatcherEventMap {
  "config:changed": { path: string };
  "config:error": { path: string; error: Error };
}

/**
 * Config file watcher
 */
export class ConfigWatcher extends EventEmitter<ConfigWatcherEventMap> {
  private watcher?: Deno.FsWatcher;
  private path: string;
  private debounceMs: number;
  private debounceTimer?: number;
  
  constructor(path: string, options?: { debounceMs?: number }) {
    super();
    this.path = path;
    this.debounceMs = options?.debounceMs ?? 100;
  }
  
  /**
   * Start watching the config file
   */
  async start(): Promise<void> {
    if (this.watcher) {
      return; // Already watching
    }
    
    try {
      this.watcher = Deno.watchFs(this.path);
      
      for await (const event of this.watcher) {
        if (event.kind === "modify" || event.kind === "create") {
          this.handleFileChange();
        }
      }
    } catch (error) {
      this.emit("config:error", {
        path: this.path,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
  
  /**
   * Stop watching the config file
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
    
    if (this.debounceTimer !== undefined) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }
  
  /**
   * Handle file change with debouncing
   */
  private handleFileChange(): void {
    // Clear existing timer
    if (this.debounceTimer !== undefined) {
      clearTimeout(this.debounceTimer);
    }
    
    // Set new timer
    this.debounceTimer = setTimeout(() => {
      this.emit("config:changed", { path: this.path });
      this.debounceTimer = undefined;
    }, this.debounceMs);
  }
  
  /**
   * Check if currently watching
   */
  get isWatching(): boolean {
    return this.watcher !== undefined;
  }
}
