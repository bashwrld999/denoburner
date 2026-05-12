import type { PipelineStage, PipelineContext } from "../types.ts";

export abstract class StageDecorator implements PipelineStage {
  abstract readonly name: string;

  constructor(protected inner: PipelineStage) {}

  async execute(ctx: PipelineContext): Promise<void> {
    return this.inner.execute(ctx);
  }
}
