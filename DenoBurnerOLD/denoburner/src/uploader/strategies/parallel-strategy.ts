/**
 * Parallel Upload Strategy
 * 
 * Uploads multiple files concurrently with configurable concurrency.
 */

import type { UploadStrategy, UploadItem } from "../interfaces/index.ts";
import type { UploadResult } from "../../types.ts";
import type { RemoteApiServer } from "../../remote-api/index.ts";

/**
 * Parallel upload options
 */
export interface ParallelUploadOptions {
  /** Maximum concurrent uploads (default: 5) */
  concurrency?: number;
  /** Delay in ms before checking RAM usage */
  ramDelay?: number;
}

/**
 * Parallel Upload Strategy
 * 
 * Uploads files to Bitburner with configurable concurrency.
 * This improves upload speed when multiple files need to be uploaded.
 */
export class ParallelStrategy implements UploadStrategy {
  readonly name = "parallel";

  private server: RemoteApiServer;
  private concurrency: number;
  private ramDelay: number;

  /**
   * @param server - Remote API server for uploading
   * @param options - Parallel upload options
   */
  constructor(server: RemoteApiServer, options: ParallelUploadOptions = {}) {
    this.server = server;
    this.concurrency = options.concurrency ?? 5;
    this.ramDelay = options.ramDelay ?? 200;
  }

  async upload(item: UploadItem): Promise<UploadResult> {
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
        ramUsage = typeof ramResult === 'number' ? ramResult : undefined;
      } catch {
        // RAM lookup failed - this is common for non-script files
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

  async uploadAll(items: UploadItem[]): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    // Process in batches based on concurrency
    for (let i = 0; i < items.length; i += this.concurrency) {
      const batch = items.slice(i, i + this.concurrency);
      const batchResults = await Promise.all(
        batch.map(item => this.upload(item))
      );
      results.push(...batchResults);
    }

    return results;
  }

  isReady(): boolean {
    return this.server.isConnected();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a parallel upload strategy
 */
export function createParallelStrategy(
  server: RemoteApiServer,
  options?: ParallelUploadOptions
): ParallelStrategy {
  return new ParallelStrategy(server, options);
}
