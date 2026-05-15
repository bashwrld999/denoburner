import type { PipelineStage, PipelineContext } from "../types.ts";
import type { SourceEntry } from "../../config/types.ts";
import { resolveSourcePath } from "../source-mapper.ts";

export class GlobFilterStage implements PipelineStage {
  readonly name = "glob_filter";

  constructor(
    private sources: SourceEntry[],
    private cwd: string,
    private defaultServer: string,
  ) {}

  async execute(ctx: PipelineContext): Promise<void> {
    const result = resolveSourcePath(ctx.localPath, this.sources, this.cwd, this.defaultServer);

    if (!result) {
      ctx.skipped = true;
      ctx.skipReason = `No matching source for ${ctx.localPath}`;
      return;
    }

    ctx.mode = result.mode;
    ctx.gameServer = result.server;
    ctx.gameFilename = result.filename;
  }
}
