/**
 * Debounce Processor
 * 
 * Debounces file events to prevent rapid-fire processing.
 */

import type { EventProcessor } from "../interfaces/index.ts";
import type { WatcherContext } from "../types.ts";

/**
 * Pending debounced item
 */
interface PendingItem {
  timer: number;
  resolve: (value: void) => void;
  rejected: boolean;
}

/**
 * Debounce Processor
 * 
 * Debounces file events by file path to prevent rapid-fire processing.
 * Multiple events for the same file within the delay window are coalesced.
 * 
 * Note: This processor should be placed FIRST in the chain (before pattern filter),
 * so it debounces raw file events before any processing.
 */
export class DebounceProcessor implements EventProcessor {
  readonly name = "debounce";
  private delay: number;
  private pending: Map<string, PendingItem> = new Map();
  
  constructor(delay: number = 50) {
    this.delay = delay;
  }
  
  async process(ctx: WatcherContext, next: () => Promise<void>): Promise<void> {
    // Create a key from event paths (raw paths from file system)
    const key = ctx.event.paths.sort().join("|");
    
    // Cancel any pending item for the same files
    const existing = this.pending.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      // Mark as rejected so the timer callback doesn't continue the chain
      existing.rejected = true;
      // Resolve the old promise to prevent hanging
      existing.resolve(undefined);
    }
    
    // Create a new debounced item
    return new Promise<void>((resolve) => {
      const item: PendingItem = {
        timer: 0,
        resolve,
        rejected: false,
      };
      
      item.timer = setTimeout(async () => {
        this.pending.delete(key);
        // Only continue the chain if this item wasn't rejected
        if (!item.rejected) {
          await next();
        }
        resolve(undefined);
      }, this.delay);
      
      this.pending.set(key, item);
    });
  }
  
  /**
   * Clear all pending debounced contexts
   */
  clear(): void {
    for (const item of this.pending.values()) {
      clearTimeout(item.timer);
      item.rejected = true;
      item.resolve(undefined);
    }
    this.pending.clear();
  }
  
  /**
   * Get number of pending debounced contexts
   */
  getPendingCount(): number {
    return this.pending.size;
  }
}
