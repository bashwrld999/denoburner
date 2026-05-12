/**
 * Upload Pipeline
 * 
 * Manages a chain of pipeline stages.
 */

import type { Pipeline, PipelineStage, UploadContext } from "../interfaces/index.ts";

/**
 * Upload Pipeline Implementation
 * 
 * Executes stages in order, passing context through each.
 */
export class UploadPipeline implements Pipeline {
  private stages: PipelineStage[] = [];

  add(stage: PipelineStage): void {
    this.stages.push(stage);
  }

  async execute(ctx: UploadContext): Promise<void> {
    let index = 0;

    const runNext = async (): Promise<void> => {
      if (ctx.stopped || index >= this.stages.length) {
        return;
      }

      const stage = this.stages[index++];
      await stage.execute(ctx, runNext);
    };

    await runNext();
  }

  getStages(): PipelineStage[] {
    return [...this.stages];
  }
}

/**
 * Create a new upload pipeline
 */
export function createPipeline(): Pipeline {
  return new UploadPipeline();
}
