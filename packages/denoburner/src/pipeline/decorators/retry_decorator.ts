import type { PipelineStage, PipelineContext } from "../types.ts";
import { StageDecorator } from "./stage_decorator.ts";
import { retry } from "../../core/retry.ts";

export class RetryStageDecorator extends StageDecorator {
  constructor(
    inner: PipelineStage,
    private maxRetries: number = 3,
    private delayMs: number = 200,
    private logger?: { warn: (msg: string) => void },
  ) {
    super(inner);
  }

  override get name(): string {
    return `${this.inner.name}_retry`;
  }

  override async execute(ctx: PipelineContext): Promise<void> {
    await retry(
      () => this.inner.execute(ctx),
      {
        maxRetries: this.maxRetries,
        baseDelayMs: this.delayMs,
        onRetry: (attempt, err) => {
          this.logger?.warn(
            `${this.inner.name} attempt ${attempt + 1} failed: ${err.message}. Retrying...`,
          );
        },
      },
    );
  }
}
