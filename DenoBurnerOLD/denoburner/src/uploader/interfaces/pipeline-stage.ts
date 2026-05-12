/**
 * Pipeline Stage Interface
 * 
 * Chain of Responsibility pattern for upload processing.
 */

import type { HmrData, UploadResult } from "../../types.ts";
import type { ProcessedFile } from "../../bundler/types.ts";

/**
 * Upload context passed through the pipeline
 */
export interface UploadContext {
  /** Original HMR data */
  hmrData: HmrData;
  /** Target locations (filename + server pairs) */
  locations: Array<{ filename: string; server: string }>;
  /** Processed files ready for upload */
  processedFiles: ProcessedFile[];
  /** Upload results */
  results: UploadResult[];
  /** Timestamp when processing started */
  startedAt: number;
  /** Metadata for stages to share data */
  metadata: Map<string, unknown>;
  /** Whether the pipeline should stop */
  stopped: boolean;
}

/**
 * Pipeline Stage
 * 
 * Processes upload context and passes it to the next stage.
 * Implementations can:
 * - Process files (transform, bundle)
 * - Upload files to Bitburner
 * - Track statistics
 * - Handle errors
 */
export interface PipelineStage {
  /**
   * Stage name for identification
   */
  readonly name: string;

  /**
   * Process the context and call next stage
   * @param ctx - Upload context
   * @param next - Function to call next stage
   */
  execute(ctx: UploadContext, next: () => Promise<void>): Promise<void>;
}

/**
 * Pipeline interface for managing stages
 */
export interface Pipeline {
  /**
   * Add a stage to the pipeline
   * @param stage - Stage to add
   */
  add(stage: PipelineStage): void;

  /**
   * Execute the pipeline with given context
   * @param ctx - Upload context
   */
  execute(ctx: UploadContext): Promise<void>;

  /**
   * Get all stages
   */
  getStages(): PipelineStage[];
}
