/**
 * Uploader Orchestrator
 * 
 * Main orchestrator for the uploader module.
 * Coordinates processors, strategies, pipeline, and repository.
 */

import { EventEmitter } from "../core/event-emitter.ts";
import type { HmrData, UploadResult } from "../types.ts";
import type {
  FileProcessor,
  UploadStrategy,
  StatsRepository,
  Pipeline,
  UploadContext,
} from "./interfaces/index.ts";
import type { UploaderStats } from "./interfaces/index.ts";
import type { RemoteApiServer } from "../remote-api/index.ts";

/**
 * Uploader event map
 */
export interface UploaderEventMap {
  "upload:start": { file: string; server: string };
  "upload:success": { result: UploadResult };
  "upload:error": { file: string; server: string; error: Error };
  "delete:success": { file: string; server: string };
}

/**
 * Uploader Orchestrator
 * 
 * Coordinates file processing, uploading, and statistics tracking.
 * Uses the pipeline pattern to process files through stages.
 * 
 * @example
 * ```ts
 * const uploader = createUploader(server, bundler, config);
 * uploader.on("upload:success", ({ result }) => console.log(result));
 * await uploader.uploadFile(hmrData);
 * ```
 */
export class UploaderOrchestrator extends EventEmitter<UploaderEventMap> {
  private processors: FileProcessor[];
  private strategy: UploadStrategy;
  private repository: StatsRepository;
  private pipeline: Pipeline;
  private server: RemoteApiServer;

  constructor(
    server: RemoteApiServer,
    processors: FileProcessor[],
    strategy: UploadStrategy,
    repository: StatsRepository,
    pipeline: Pipeline,
  ) {
    super();
    this.server = server;
    this.processors = processors;
    this.strategy = strategy;
    this.repository = repository;
    this.pipeline = pipeline;
  }

  /**
   * Get current statistics
   */
  getStats(): UploaderStats {
    return this.repository.getStats();
  }

  /**
   * Upload a file based on HMR data
   */
  async uploadFile(data: HmrData): Promise<UploadResult[]> {
    // Create upload context
    const ctx: UploadContext = {
      hmrData: data,
      locations: data.location(data.file),
      processedFiles: [],
      results: [],
      startedAt: Date.now(),
      metadata: new Map(),
      stopped: false,
    };

    // Emit start event for each location
    for (const { filename, server } of ctx.locations) {
      this.emit("upload:start", { file: filename, server });
    }

    // Execute pipeline
    await this.pipeline.execute(ctx);

    // Emit result events
    for (const result of ctx.results) {
      if (result.success) {
        this.emit("upload:success", { result });
      } else {
        this.emit("upload:error", {
          file: result.filename,
          server: result.server,
          error: result.error!,
        });
      }
    }

    return ctx.results;
  }

  /**
   * Delete a file from Bitburner
   */
  async deleteFile(data: HmrData): Promise<void> {
    const locations = data.location(data.file);
    const api = this.server.getApi();

    for (const { filename, server } of locations) {
      try {
        await api.deleteFile(server, filename);
        this.repository.recordDelete(filename, server);
        this.emit("delete:success", { file: filename, server });
      } catch {
        // Ignore delete errors
      }
    }
  }

  /**
   * Upload multiple files in parallel with concurrency control
   */
  async uploadFiles(files: HmrData[], concurrency: number = 5): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    // Process in batches based on concurrency
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(file => this.uploadFile(file))
      );
      results.push(...batchResults.flat());
    }

    return results;
  }

  /**
   * Update files watched count
   */
  setFilesWatched(count: number): void {
    this.repository.setFilesWatched(count);
  }

  /**
   * Add a custom processor
   */
  addProcessor(processor: FileProcessor): void {
    this.processors.push(processor);
  }

  /**
   * Get processors
   */
  getProcessors(): FileProcessor[] {
    return [...this.processors];
  }
}
