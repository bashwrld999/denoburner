/**
 * Pipeline Stages
 * 
 * Exports all pipeline stages.
 */

export { ProcessStage } from "./process-stage.ts";
export { UploadStage } from "./upload-stage.ts";
export { TrackStage } from "./track-stage.ts";

import type { PipelineStage, FileProcessor, UploadStrategy, StatsRepository } from "../../interfaces/index.ts";
import { ProcessStage } from "./process-stage.ts";
import { UploadStage } from "./upload-stage.ts";
import { TrackStage } from "./track-stage.ts";

/**
 * Create default pipeline stages
 */
export function createDefaultStages(
  processors: FileProcessor[],
  strategy: UploadStrategy,
  repository: StatsRepository,
): PipelineStage[] {
  return [
    new ProcessStage(processors),
    new UploadStage(strategy),
    new TrackStage(repository),
  ];
}
