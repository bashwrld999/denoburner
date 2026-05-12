/**
 * Batched Upload Strategy
 * 
 * Collects files and uploads them in batches.
 */

import type { UploadStrategy, UploadItem } from "../interfaces/index.ts";
import type { UploadResult } from "../../types.ts";
import type { RemoteApiServer } from "../../remote-api/index.ts";
import type { CategoryLogger } from "../../logger/interfaces/index.ts";

/**
 * Batched Upload Strategy Options
 */
export interface BatchedStrategyOptions {
  /** Maximum batch size before auto-flush */
  maxSize?: number;
  /** Maximum time in ms before auto-flush */
  timeout?: number;
  /** Delay in ms before checking RAM usage */
  ramDelay?: number;
  /** Logger for debug messages */
  log?: CategoryLogger;
}

/**
 * Batched Upload Strategy
 * 
 * Collects files and uploads them in batches for efficiency.
 * Useful for initial uploads or rapid file changes.
 */
export class BatchedStrategy implements UploadStrategy {
  readonly name = "batched";

  private server: RemoteApiServer;
  private maxSize: number;
  private timeout: number;
  private ramDelay: number;
  private log?: CategoryLogger;
  private batch: UploadItem[] = [];
  private flushTimer?: number;
  private pendingFlush?: () => void;

  constructor(server: RemoteApiServer, options: BatchedStrategyOptions = {}) {
    this.server = server;
    this.maxSize = options.maxSize ?? 10;
    this.timeout = options.timeout ?? 100;
    this.ramDelay = options.ramDelay ?? 200;
    this.log = options.log;
  }

  async upload(item: UploadItem): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      this.batch.push(item);

      // Auto-flush if batch is full
      if (this.batch.length >= this.maxSize) {
        this.flushInternal().then((results) => {
          const result = results.find(
            (r) => r.filename === item.file.filename && r.server === item.server
          );
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Upload result not found"));
          }
        });
        return;
      }

      // Set up timeout flush
      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flushInternal().then((results) => {
            const result = results.find(
              (r) => r.filename === item.file.filename && r.server === item.server
            );
            if (result) {
              resolve(result);
            }
          });
        }, this.timeout);
      }
    });
  }

  async uploadAll(items: UploadItem[]): Promise<UploadResult[]> {
    // Add all items to batch
    this.batch.push(...items);
    
    // Flush immediately
    return this.flushInternal();
  }

  isReady(): boolean {
    return this.server.isConnected();
  }

  async flush(): Promise<UploadResult[]> {
    return this.flushInternal();
  }

  private async flushInternal(): Promise<UploadResult[]> {
    // Clear timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Get items to flush
    const items = this.batch;
    this.batch = [];

    if (items.length === 0) {
      return [];
    }

    // Upload all items
    const results: UploadResult[] = [];

    for (const item of items) {
      const result = await this.uploadImmediate(item);
      results.push(result);
    }

    return results;
  }

  private async uploadImmediate(item: UploadItem): Promise<UploadResult> {
    const { file, server } = item;
    const api = this.server.getApi();

    try {
      // Upload to Bitburner
      await api.pushFile(server, file.filename, file.content);

      // Get RAM usage with delay
      let ramUsage: number | undefined;
      try {
        await this.delay(this.ramDelay);
        const ramResult = await api.getScriptRam(server, file.filename);
        // The API returns the RAM value directly (in GB)
        ramUsage = typeof ramResult === 'number' ? ramResult : undefined;
      } catch (ramError) {
        // RAM lookup failed - this is common for non-script files
        this.log?.debug(`RAM lookup failed for ${server}/${file.filename}: ${ramError}`);
      }

      return {
        sourceFile: item.originalPath,
        filename: file.filename,
        server,
        success: true,
        content: file.content,
        ramUsage,
        bundled: file.bundled,
        bundledDeps: file.bundledDeps,
      };
    } catch (error) {
      return {
        sourceFile: item.originalPath,
        filename: file.filename,
        server,
        success: false,
        content: file.content,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
