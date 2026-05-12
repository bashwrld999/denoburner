/**
 * Track Stage
 * 
 * Tracks upload statistics.
 */

import type { PipelineStage, UploadContext, StatsRepository } from "../../interfaces/index.ts";

/**
 * Track Stage
 * 
 * Records upload results in the stats repository.
 */
export class TrackStage implements PipelineStage {
  readonly name = "track";

  private repository: StatsRepository;

  constructor(repository: StatsRepository) {
    this.repository = repository;
  }

  async execute(ctx: UploadContext, next: () => Promise<void>): Promise<void> {
    const { results } = ctx;

    // Record each result
    for (const result of results) {
      if (result.success) {
        this.repository.recordUpload(result);
      }
    }

    // Continue to next stage
    await next();
  }
}
