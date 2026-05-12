import type { PipelineContext, PipelineStage, IPipeline } from "./types.ts";

const DEFAULT_CONCURRENCY = 8;

export class UploadPipeline implements IPipeline {
  private stages: PipelineStage[] = [];
  private concurrency: number;

  constructor(concurrency: number = DEFAULT_CONCURRENCY) {
    this.concurrency = concurrency;
  }

  use(stage: PipelineStage): IPipeline {
    this.stages.push(stage);
    return this;
  }

  async run(ctx: PipelineContext): Promise<PipelineContext> {
    for (const stage of this.stages) {
      if (ctx.skipped) break;

      try {
        await stage.execute(ctx);
      } catch (err) {
        // Preserve the first error; cascade errors from dependent stages don't overwrite it
        if (!ctx.error) {
          ctx.error = err instanceof Error ? err : new Error(String(err));
        }
      }
    }

    ctx.finishedAt = Date.now();
    return ctx;
  }

  async runAll(contexts: PipelineContext[]): Promise<PipelineContext[]> {
    const results: PipelineContext[] = [];
    const queue = [...contexts];

    const worker = async () => {
      while (queue.length > 0) {
        const ctx = queue.shift()!;
        const result = await this.run(ctx);
        results.push(result);
      }
    };

    const workers = Array.from({ length: Math.min(this.concurrency, contexts.length) }, () => worker());
    await Promise.all(workers);

    return results;
  }
}
