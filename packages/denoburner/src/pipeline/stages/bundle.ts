import type { PipelineStage, PipelineContext } from "../types.ts";
import type { IBundler } from "../../bundler/interface.ts";
import type { SourceEntry } from "../../config/types.ts";
import { resolveSourceServerRoot } from "../source-mapper.ts";
import { PipelineError } from "../../core/errors.ts";
import type { AggregatedHooks } from "../../plugin/types.ts";

export class BundleStage implements PipelineStage {
  readonly name = "bundle";

  constructor(
    private bundler: IBundler,
    private sources: SourceEntry[] = [],
    private cwd: string = Deno.cwd(),
    private hooks?: AggregatedHooks,
  ) {}

  async execute(ctx: PipelineContext): Promise<void> {
    if (!ctx.rawContent) {
      throw new PipelineError("No raw content to bundle", { localPath: ctx.localPath });
    }

    let content = ctx.rawContent;
    if (this.hooks?.beforeBuild) {
      content = await this.hooks.beforeBuild(ctx.localPath, content);
    }

    const mode = ctx.mode ?? "passthrough";

    switch (mode) {
      case "passthrough":
        ctx.bundledContent = this.bundler.passthrough(content).code;
        break;
      case "transpile":
        ctx.bundledContent = (await this.bundler.transpile(ctx.localPath, content)).code;
        break;
      case "bundle": {
        const serverRoot = resolveSourceServerRoot(ctx.localPath, this.sources, this.cwd) ?? ctx.localPath;
        ctx.bundledContent = (await this.bundler.bundle(ctx.localPath, content, serverRoot)).code;
        break;
      }
    }

    if (this.hooks?.afterBuild && ctx.bundledContent) {
      ctx.bundledContent = await this.hooks.afterBuild(ctx.localPath, ctx.bundledContent);
    }
  }
}
