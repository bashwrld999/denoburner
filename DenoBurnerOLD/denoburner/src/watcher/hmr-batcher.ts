/**
 * HMR Batcher
 * 
 * Batches multiple HMR events that occur in quick succession.
 * This is useful for handling bulk file changes (git checkout, npm install, etc.)
 * efficiently by grouping them into a single batch operation.
 */

import type { HmrData } from "./types.ts";
import type { DependencyGraph } from "./dependency-graph.ts";
import type { Logger, CategoryLogger } from "../logger/interfaces/index.ts";

/**
 * A batch of HMR events
 */
export interface BatchHmrEvent {
  /** Unique batch ID */
  id: string;
  /** Individual HMR events in this batch */
  events: HmrData[];
  /** Timestamp when the batch was created */
  timestamp: number;
  /** All files affected by this batch (including cascading) */
  affectedFiles: string[];
  /** Number of unique files changed */
  uniqueFileCount: number;
  /** Whether this batch contains deletions */
  hasDeletions: boolean;
  /** Servers affected by this batch */
  affectedServers: Set<string>;
}

/**
 * Options for the HMR batcher
 */
export interface HmrBatcherOptions {
  /** Delay in ms to wait for more events before flushing (default: 50) */
  batchDelay?: number;
  /** Maximum batch size before forcing a flush (default: 100) */
  maxBatchSize?: number;
  /** Whether to compute affected files using dependency graph */
  computeAffected?: boolean;
}

/**
 * Event handler for batch events
 */
export type BatchHandler = (batch: BatchHmrEvent) => void | Promise<void>;

/**
 * HMR Batcher
 * 
 * Collects HMR events and emits them in batches.
 */
export class HmrBatcher {
  private pending: HmrData[] = [];
  private timeout?: ReturnType<typeof setTimeout>;
  private batchDelay: number;
  private maxBatchSize: number;
  private computeAffected: boolean;
  private dependencyGraph?: DependencyGraph;
  private handlers: BatchHandler[] = [];
  private log?: Logger | CategoryLogger;
  private batchCount = 0;

  constructor(options: HmrBatcherOptions = {}, log?: Logger | CategoryLogger) {
    this.batchDelay = options.batchDelay ?? 50;
    this.maxBatchSize = options.maxBatchSize ?? 100;
    this.computeAffected = options.computeAffected ?? true;
    this.log = log;
  }

  /**
   * Set the dependency graph for computing affected files
   */
  setDependencyGraph(graph: DependencyGraph): void {
    this.dependencyGraph = graph;
  }

  /**
   * Set logger for debugging
   */
  setLogger(log: Logger | CategoryLogger): void {
    this.log = log;
  }

  /**
   * Add an HMR event to the pending batch
   */
  addEvent(event: HmrData): void {
    this.pending.push(event);

    // Check if we should force a flush
    if (this.pending.length >= this.maxBatchSize) {
      this.flush();
      return;
    }

    // Reset timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.flush();
    }, this.batchDelay);
  }

  /**
   * Add multiple HMR events at once
   */
  addEvents(events: HmrData[]): void {
    for (const event of events) {
      this.pending.push(event);
    }

    // Check if we should force a flush
    if (this.pending.length >= this.maxBatchSize) {
      this.flush();
      return;
    }

    // Reset timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.flush();
    }, this.batchDelay);
  }

  /**
   * Register a handler for batch events
   */
  onBatch(handler: BatchHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index !== -1) {
        this.handlers.splice(index, 1);
      }
    };
  }

  /**
   * Flush pending events as a batch
   */
  flush(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }

    if (this.pending.length === 0) {
      return;
    }

    const batch = this.createBatch();
    this.pending = [];
    this.batchCount++;

    this.log?.debug(
      `Flushing batch #${this.batchCount}: ${batch.events.length} events, ${batch.uniqueFileCount} unique files`
    );

    // Notify handlers
    for (const handler of this.handlers) {
      try {
        handler(batch);
      } catch (error) {
        this.log?.error(`Batch handler error: ${error}`);
      }
    }
  }

  /**
   * Get the number of pending events
   */
  getPendingCount(): number {
    return this.pending.length;
  }

  /**
   * Check if there are pending events
   */
  hasPending(): boolean {
    return this.pending.length > 0;
  }

  /**
   * Get batch statistics
   */
  getStats(): {
    batchCount: number;
    pendingCount: number;
    batchDelay: number;
    maxBatchSize: number;
  } {
    return {
      batchCount: this.batchCount,
      pendingCount: this.pending.length,
      batchDelay: this.batchDelay,
      maxBatchSize: this.maxBatchSize,
    };
  }

  /**
   * Create a batch from pending events
   */
  private createBatch(): BatchHmrEvent {
    const events = [...this.pending];
    const uniqueFiles = new Set(events.map(e => e.file));
    const affectedServers = new Set<string>();
    const hasDeletions = events.some(e => e.event === "delete");

    // Collect servers from events
    for (const event of events) {
      try {
        const locations = event.location(event.file);
        for (const loc of locations) {
          affectedServers.add(loc.server);
        }
      } catch {
        // Ignore location resolution errors
      }
    }

    // Compute affected files using dependency graph
    let affectedFiles: string[];
    
    if (this.computeAffected && this.dependencyGraph) {
      affectedFiles = this.computeAffectedFiles(events, uniqueFiles);
    } else {
      affectedFiles = [...uniqueFiles];
    }

    return {
      id: crypto.randomUUID(),
      events,
      timestamp: Date.now(),
      affectedFiles,
      uniqueFileCount: uniqueFiles.size,
      hasDeletions,
      affectedServers,
    };
  }

  /**
   * Compute all affected files including cascading updates
   */
  private computeAffectedFiles(events: HmrData[], directFiles: Set<string>): string[] {
    const affected = new Set<string>(directFiles);

    // For each changed file, find its dependents
    for (const event of events) {
      if (event.event === "delete") {
        // Deletions don't trigger cascading updates
        continue;
      }

      if (this.dependencyGraph) {
        const cascading = this.dependencyGraph.getAffectedFiles(event.file);
        for (const file of cascading.affectedFiles) {
          affected.add(file);
        }
      }
    }

    return [...affected];
  }
}

/**
 * Create an HMR batcher instance
 */
export function createHmrBatcher(
  options?: HmrBatcherOptions,
  log?: Logger | CategoryLogger
): HmrBatcher {
  return new HmrBatcher(options, log);
}
