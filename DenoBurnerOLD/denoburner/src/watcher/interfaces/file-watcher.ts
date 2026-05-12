/**
 * File Watcher Interface
 * 
 * Strategy pattern for different file watching implementations.
 */

import type { FileWatchEvent } from "../types.ts";

/**
 * Callback type for file watch events
 */
export type FileWatchCallback = (event: FileWatchEvent) => void;

/**
 * File Watcher interface
 * 
 * Implementations provide different strategies for watching file system changes.
 * 
 * @example
 * ```ts
 * class DenoFsWatcher implements FileWatcher {
 *   // ... implementation
 * }
 * 
 * const watcher = new DenoFsWatcher("/path/to/watch");
 * watcher.onEvent((event) => console.log(event));
 * await watcher.start();
 * ```
 */
export interface FileWatcher {
  /**
   * Start watching for file system changes
   */
  start(): Promise<void>;
  
  /**
   * Stop watching for file system changes
   */
  stop(): void;
  
  /**
   * Check if the watcher is currently running
   */
  isRunning(): boolean;
  
  /**
   * Register a callback for file watch events
   * @param callback Function to call when a file event occurs
   */
  onEvent(callback: FileWatchCallback): void;
  
  /**
   * Unregister a callback
   * @param callback The callback to remove
   */
  offEvent(callback: FileWatchCallback): void;
  
  /**
   * Get the base directory being watched
   */
  getBaseDir(): string;
}
