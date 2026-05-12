/**
 * Uploader Module
 * 
 * Handles uploading files to Bitburner with smart bundling and RAM tracking.
 * 
 * Architecture:
 * - Strategy Pattern: File processors for different file types
 * - Strategy Pattern: Upload strategies for different upload behaviors
 * - Repository Pattern: Stats tracking
 * - Chain of Responsibility: Pipeline stages for processing
 * - Factory Pattern: Easy creation of configured uploaders
 */

// Main exports
export { UploaderOrchestrator, type UploaderEventMap } from "./uploader.ts";
export { createUploader, createCustomUploader } from "./factory.ts";

// Initial upload orchestrator
export {
  InitialUploadOrchestrator,
  createInitialUploadOrchestrator,
  type InitialUploadDeps,
  type UploadStats,
} from "./initial-upload-orchestrator.ts";

// Interfaces
export type {
  FileProcessor,
  UploadStrategy,
  UploadItem,
  StatsRepository,
  UploaderStats,
  FileInfo,
  LastUpload,
  PipelineStage,
  Pipeline,
  UploadContext,
} from "./interfaces/index.ts";

// Processors
export { BundlerProcessor, RawProcessor, createDefaultProcessors, findProcessor } from "./processors/index.ts";

// Strategies
export { 
  ImmediateStrategy, 
  BatchedStrategy, 
  ParallelStrategy,
  createParallelStrategy,
  createDefaultStrategy, 
  type StrategyType, 
  type StrategyOptions,
  type BatchedStrategyOptions,
  type ParallelUploadOptions,
} from "./strategies/index.ts";

// Repository
export { InMemoryStatsRepository, createStatsRepository } from "./repository/index.ts";

// Pipeline
export {
  UploadPipeline,
  createPipeline,
  ProcessStage,
  UploadStage,
  TrackStage,
  createDefaultStages,
} from "./pipeline/index.ts";

// Types (backward compatibility)
export type { UploaderStats as UploaderStatsType } from "./types.ts";
