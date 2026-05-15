import type { PipelineStage, PipelineContext } from "../types.ts";

export class PathMapStage implements PipelineStage {
  readonly name = "path_map";

  constructor(
    private defaultServer: string,
    private cwd: string,
  ) {}

  async execute(ctx: PipelineContext): Promise<void> {
    if (ctx.gameServer && ctx.gameFilename) return;

    const normalizedCwd = this.cwd.replace(/\\/g, "/") + "/";
    ctx.gameServer = this.defaultServer;
    ctx.gameFilename = ctx.localPath.replace(/\\/g, "/").startsWith(normalizedCwd)
      ? ctx.localPath.replace(/\\/g, "/").substring(normalizedCwd.length)
      : ctx.localPath.replace(/\\/g, "/");
  }
}
