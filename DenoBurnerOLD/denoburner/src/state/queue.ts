/**
 * Upload Queue
 * 
 * Manages offline queue and retry logic for failed uploads.
 */

import type { HmrData } from "../types.ts";
import type { DenoburnerStateStore } from "./store.ts";
import type { QueuedUpload } from "./types.ts";
import type { CategoryLogger } from "../logger/interfaces/index.ts";

/**
 * Queue processor function type
 */
export type QueueProcessor = (item: QueuedUpload) => Promise<boolean>;

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds */
  baseDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Whether to retry on connection errors */
  retryOnDisconnect: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryOnDisconnect: true,
};

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Upload Queue Manager
 * 
 * Handles:
 * - Queuing uploads when offline
 * - Retrying failed uploads with exponential backoff
 * - Processing queue when connection is restored
 */
export class UploadQueueManager {
  private store: DenoburnerStateStore;
  private config: RetryConfig;
  private processor?: QueueProcessor;
  private processing = false;
  private abortController?: AbortController;
  private log: CategoryLogger;

  constructor(
    store: DenoburnerStateStore,
    log: CategoryLogger,
    config: Partial<RetryConfig> = {},
  ) {
    this.store = store;
    this.log = log;
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Set the upload processor function
   */
  setProcessor(processor: QueueProcessor): void {
    this.processor = processor;
  }

  /**
   * Add an upload to the queue
   */
  enqueue(hmrData: HmrData): QueuedUpload {
    const item: QueuedUpload = {
      id: generateId(),
      hmrData,
      retries: 0,
      maxRetries: this.config.maxRetries,
      queuedAt: new Date(),
    };

    this.store.dispatch({
      type: "queue/add",
      item,
    });

    // Try to process immediately if connected
    this.tryProcess();

    return item;
  }

  /**
   * Remove an item from the queue
   */
  dequeue(id: string): void {
    this.store.dispatch({
      type: "queue/remove",
      id,
    });
  }

  /**
   * Mark an upload as successful
   */
  markSuccess(id: string): void {
    this.dequeue(id);
  }

  /**
   * Mark an upload as failed and schedule retry
   */
  markFailed(id: string, error: Error): void {
    const state = this.store.getState();
    const item = state.queue.pending.find(i => i.id === id) 
      ?? state.queue.failed.find(i => i.id === id);

    if (!item) return;

    // Check if we should retry
    if (item.retries < item.maxRetries) {
      this.store.dispatch({
        type: "queue/retry",
        id,
        error,
      });

      // Schedule retry with backoff
      const delay = calculateDelay(item.retries, this.config);
      setTimeout(() => this.retryItem(id), delay);
    } else {
      // Max retries exceeded, move to failed
      this.store.dispatch({
        type: "queue/retry",
        id,
        error,
      });
    }
  }

  /**
   * Set offline mode
   */
  setOffline(offline: boolean): void {
    this.store.dispatch({
      type: "queue/offline",
      value: offline,
    });

    if (!offline) {
      // Connection restored, process queue
      this.tryProcess();
    }
  }

  /**
   * Start processing the queue
   */
  start(): void {
    this.abortController = new AbortController();
    this.tryProcess();
  }

  /**
   * Stop processing the queue
   */
  stop(): void {
    this.abortController?.abort();
    this.processing = false;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    pending: number;
    failed: number;
    processing: boolean;
    offline: boolean;
  } {
    const state = this.store.getState();
    return {
      pending: state.queue.pending.length,
      failed: state.queue.failed.length,
      processing: state.queue.processing,
      offline: state.queue.offline,
    };
  }

  /**
   * Subscribe to queue state changes
   */
  onStateChange(callback: (state: { pending: number; items: QueuedUpload[] }) => void): () => void {
    return this.store.subscribe(
      (state) => ({ pending: state.queue.pending.length, items: state.queue.pending }),
      (value) => callback(value)
    );
  }

  /**
   * Retry all failed items
   */
  retryAllFailed(): void {
    const state = this.store.getState();
    
    for (const item of state.queue.failed) {
      // Reset retry count
      const resetItem: QueuedUpload = {
        ...item,
        retries: 0,
      };
      
      this.store.dispatch({
        type: "queue/remove",
        id: item.id,
      });
      
      this.store.dispatch({
        type: "queue/add",
        item: resetItem,
      });
    }

    this.tryProcess();
  }

  /**
   * Clear all failed items
   */
  clearFailed(): void {
    const state = this.store.getState();
    
    for (const item of state.queue.failed) {
      this.store.dispatch({
        type: "queue/remove",
        id: item.id,
      });
    }
  }

  /**
   * Try to process the queue
   */
  private async tryProcess(): Promise<void> {
    if (this.processing) return;
    if (!this.processor) return;

    const state = this.store.getState();
    if (state.queue.offline) return;
    if (state.queue.pending.length === 0) return;

    this.processing = true;
    this.store.dispatch({ type: "queue/processing", value: true });

    try {
      await this.processQueue();
    } finally {
      this.processing = false;
      this.store.dispatch({ type: "queue/processing", value: false });
    }
  }

  /**
   * Process all items in the queue
   */
  private async processQueue(): Promise<void> {
    const log = this.log;
    const processor = this.processor;
    
    if (!processor) return;

    while (true) {
      const state = this.store.getState();
      
      if (state.queue.offline || state.queue.pending.length === 0) {
        break;
      }

      if (this.abortController?.signal.aborted) {
        break;
      }

      const item = state.queue.pending[0];
      
      try {
        log.debug(`Processing queued upload: ${item.hmrData.file}`);
        const success = await processor(item);
        
        if (success) {
          this.markSuccess(item.id);
          log.debug(`Successfully uploaded: ${item.hmrData.file}`);
        } else {
          this.markFailed(item.id, new Error("Upload returned false"));
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        log.warn(`Upload failed: ${item.hmrData.file} - ${err.message}`);
        this.markFailed(item.id, err);
      }
    }
  }

  /**
   * Retry a specific item
   */
  private async retryItem(id: string): Promise<void> {
    const state = this.store.getState();
    const item = state.queue.pending.find(i => i.id === id);

    if (!item) return;
    
    const processor = this.processor;
    if (!processor) return;

    try {
      const success = await processor(item);
      if (success) {
        this.markSuccess(id);
      } else {
        this.markFailed(id, new Error("Upload returned false"));
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.markFailed(id, err);
    }
  }
}

/**
 * Create an upload queue manager
 */
export function createUploadQueue(
  store: DenoburnerStateStore,
  log: CategoryLogger,
  config?: Partial<RetryConfig>,
): UploadQueueManager {
  return new UploadQueueManager(store, log, config);
}
