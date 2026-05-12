import type { PipelineStage, PipelineContext } from "../types.ts";
import { StageDecorator } from "./stage_decorator.ts";

export class TimingStageDecorator extends StageDecorator {
  constructor(
    inner: PipelineStage,
    private logger?: { info: (msg: string) => void },
  ) {
    super(inner);
  }

  override get name(): string {
    return `${this.inner.name}_timed`;
  }

  override async execute(ctx: PipelineContext): Promise<void> {
    const start = performance.now();
    try {
      await this.inner.execute(ctx);
    } finally {
      const elapsed = performance.now() - start;
      this.logger?.info(`${this.inner.name}: ${elapsed.toFixed(1)}ms`);
    }
  }
}
