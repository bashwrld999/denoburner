/**
 * Process Stage
 * 
 * Processes files through the file processors.
 */

import type { PipelineStage, UploadContext, FileProcessor } from "../../interfaces/index.ts";
import { findProcessor } from "../../processors/index.ts";

/**
 * Process Stage
 * 
 * Processes files through the appropriate file processor.
 * Handles bundling, transpilation, and raw file handling.
 */
export class ProcessStage implements PipelineStage {
  readonly name = "process";

  private processors: FileProcessor[];

  constructor(processors: FileProcessor[]) {
    this.processors = processors;
  }

  async execute(ctx: UploadContext, next: () => Promise<void>): Promise<void> {
    const { hmrData, locations } = ctx;

    // Process file for each location
    for (const location of locations) {
      try {
        // Find the appropriate processor (async to support async canProcess)
        const processor = await findProcessor(this.processors, hmrData.file, hmrData);

        // Process the file
        const processedFile = await processor.process(hmrData.file, hmrData);

        processedFile.server = location.server;
        processedFile.filename = location.filename;

        // Store processed file
        ctx.processedFiles.push(processedFile);
      } catch (error) {
        // Store error as metadata for error handling
        ctx.metadata.set(`error:${location.server}:${location.filename}`, error);
      }
    }

    // Continue to next stage
    await next();
  }
}
