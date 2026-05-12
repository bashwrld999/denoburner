/**
 * Uploader Interfaces
 * 
 * Exports all interfaces for the uploader module.
 */

export type { FileProcessor } from "./file-processor.ts";
export type { UploadStrategy, UploadItem } from "./upload-strategy.ts";
export type { StatsRepository, UploaderStats, FileInfo, LastUpload } from "./stats-repository.ts";
export type { PipelineStage, Pipeline, UploadContext } from "./pipeline-stage.ts";
