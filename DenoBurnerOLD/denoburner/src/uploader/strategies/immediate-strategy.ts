/**
 * Immediate Upload Strategy
 * 
 * Uploads files immediately without batching or queuing.
 */

import type { UploadStrategy, UploadItem } from "../interfaces/index.ts";
import type { UploadResult } from "../../types.ts";
import type { RemoteApiServer } from "../../remote-api/index.ts";
import type { CategoryLogger } from "../../logger/interfaces/index.ts";

/**
 * Immediate Upload Strategy
 * 
 * Uploads files to Bitburner as soon as they are received.
 * This is the simplest strategy and is suitable for most use cases.
 */
export class ImmediateStrategy implements UploadStrategy {
  readonly name = "immediate";

  private server: RemoteApiServer;
  private ramDelay: number;
  private log?: CategoryLogger;

  /**
   * @param server - Remote API server for uploading
   * @param ramDelay - Delay in ms before checking RAM usage
   * @param log - Optional logger for debug messages
   */
  constructor(server: RemoteApiServer, ramDelay: number = 200, log?: CategoryLogger) {
    this.server = server;
    this.ramDelay = ramDelay;
    this.log = log;
  }

  async upload(item: UploadItem): Promise<UploadResult> {
    const { file, originalPath, server } = item;
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
        // Log for debugging but continue without RAM
        this.log?.debug(`RAM lookup failed for ${server}/${file.filename}: ${ramError}`);
      }

      return {
        sourceFile: originalPath,
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
        sourceFile: originalPath,
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

    for (const item of items) {
      const result = await this.upload(item);
      results.push(result);
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
