/**
 * Upload Stage
 * 
 * Uploads processed files to Bitburner.
 */

import type { PipelineStage, UploadContext, UploadStrategy, UploadItem } from "../../interfaces/index.ts";

/**
 * Upload Stage
 * 
 * Uploads processed files using the configured upload strategy.
 */
export class UploadStage implements PipelineStage {
  readonly name = "upload";

  private strategy: UploadStrategy;

  constructor(strategy: UploadStrategy) {
    this.strategy = strategy;
  }

  async execute(ctx: UploadContext, next: () => Promise<void>): Promise<void> {
    const { hmrData, processedFiles } = ctx;

    // Check if we have files to upload
    if (processedFiles.length === 0) {
      await next();
      return;
    }

    // Create upload items
    const items: UploadItem[] = processedFiles.map((file) => ({
      file,
      originalPath: hmrData.file,
      server: file.server,
      timestamp: Date.now(),
    }));

    // Upload using strategy
    const results = await this.strategy.uploadAll(items);

    // Store results
    ctx.results.push(...results);

    // Continue to next stage
    await next();
  }
}
