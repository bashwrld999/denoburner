/**
 * Batch Processor
 * 
 * Batches multiple file events together for efficient processing.
 */

import type { EventProcessor } from "../interfaces/index.ts";
import type { WatcherContext, ProcessedFile } from "../types.ts";

/**
 * Batch options
 */
export interface BatchOptions {
  /** Maximum batch size before forcing flush */
  maxSize?: number;
  /** Maximum time to wait before forcing flush (ms) */
  timeout?: number;
}

/**
 * Batched context
 */
interface BatchedContext {
  files: ProcessedFile[];
  timer?: number;
  resolve: () => void;
}

/**
 * Batch Processor
 * 
 * Collects multiple file events and processes them together.
 * Useful for reducing the number of uploads when many files change at once.
 */
export class BatchProcessor implements EventProcessor {
  readonly name = "batch";
  private maxSize: number;
  private timeout: number;
  private batch: BatchedContext | null = null;
  private flushPromise: Promise<void> | null = null;
  
  constructor(options: BatchOptions = {}) {
    this.maxSize = options.maxSize ?? 10;
    this.timeout = options.timeout ?? 100;
  }
  
  async process(ctx: WatcherContext, next: () => Promise<void>): Promise<void> {
    // If batch is disabled (maxSize = 1), process immediately
    if (this.maxSize <= 1) {
      await next();
      return;
    }
    
    // Add files to current batch
    if (!this.batch) {
      this.batch = {
        files: [...ctx.files],
        resolve: () => {},
      };
      
      // Set up timeout flush
      this.flushPromise = new Promise<void>((resolve) => {
        this.batch!.resolve = resolve;
        
        this.batch!.timer = setTimeout(() => {
          this.flush(next);
        }, this.timeout);
      });
    } else {
      // Add to existing batch
      this.batch.files.push(...ctx.files);
    }
    
    // Check if we should flush now
    if (this.batch.files.length >= this.maxSize) {
      await this.flush(next);
    } else {
      // Wait for timeout or max size
      await this.flushPromise;
    }
  }
  
  /**
   * Flush the current batch
   */
  private async flush(next: () => Promise<void>): Promise<void> {
    if (!this.batch) return;
    
    const batch = this.batch;
    this.batch = null;
    
    // Clear timeout
    if (batch.timer) {
      clearTimeout(batch.timer);
    }
    
    // Process the batch
    // Note: We create a synthetic context with all batched files
    // The actual processing happens in the next processor
    await next();
    
    // Resolve the flush promise
    batch.resolve();
  }
  
  /**
   * Force flush any pending batch
   */
  async forceFlush(): Promise<void> {
    if (this.batch && this.flushPromise) {
      await this.flushPromise;
    }
  }
  
  /**
   * Get current batch size
   */
  getBatchSize(): number {
    return this.batch?.files.length ?? 0;
  }
  
  /**
   * Check if there's a pending batch
   */
  hasPendingBatch(): boolean {
    return this.batch !== null;
  }
}
