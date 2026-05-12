import type { PipelineStage, PipelineContext } from "../types.ts";
import type { IBundler } from "../../bundler/interface.ts";
import { resolveServerRoot } from "../servers.ts";

export class BundleStage implements PipelineStage {
  readonly name = "bundle";

  constructor(
    private bundler: IBundler,
    private serversDir?: string,
  ) {}

  async execute(ctx: PipelineContext): Promise<void> {
    if (!ctx.rawContent) {
      throw new Error("No raw content to bundle");
    }

    const mode = ctx.mode ?? "passthrough";

    switch (mode) {
      case "passthrough":
        ctx.bundledContent = this.bundler.passthrough(ctx.rawContent).code;
        break;
      case "transpile":
        ctx.bundledContent = (await this.bundler.transpile(ctx.localPath, ctx.rawContent)).code;
        break;
      case "bundle": {
        const serverRoot = resolveServerRoot(ctx.localPath, this.serversDir) ?? ctx.localPath;
        ctx.bundledContent = (await this.bundler.bundle(ctx.localPath, ctx.rawContent, serverRoot)).code;
        break;
      }
    }
  }
}
