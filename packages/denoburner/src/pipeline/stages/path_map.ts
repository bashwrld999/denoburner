import type { PipelineStage, PipelineContext } from "../types.ts";
import type { DenoburnerConfig } from "../../config/types.ts";
import { parseServerPath } from "../servers.ts";

export class PathMapStage implements PipelineStage {
  readonly name = "path_map";

  constructor(private config: DenoburnerConfig) {}

  async execute(ctx: PipelineContext): Promise<void> {
    if (ctx.serverOverride) {
      const cwd = Deno.cwd().replace(/\\/g, "/") + "/";
      const relPath = ctx.localPath.replace(/\\/g, "/").startsWith(cwd)
        ? ctx.localPath.replace(/\\/g, "/").substring(cwd.length)
        : ctx.localPath.replace(/\\/g, "/");
      ctx.gameServer = ctx.serverOverride;
      ctx.gameFilename = relPath;
      return;
    }

    const { server, gameFilename } = this.resolve(ctx.localPath);
    ctx.gameServer = server;
    ctx.gameFilename = gameFilename;
  }

  private resolve(localPath: string): { server: string; gameFilename: string } {
    const serversDir = this.config.serversDir ?? "src/servers";
    const parsed = parseServerPath(localPath, serversDir);
    if (parsed) return { server: parsed.server, gameFilename: parsed.relativePath };

    const cwd = Deno.cwd().replace(/\\/g, "/") + "/";
    const relPath = localPath.replace(/\\/g, "/").startsWith(cwd)
      ? localPath.replace(/\\/g, "/").substring(cwd.length)
      : localPath.replace(/\\/g, "/");

    return { server: this.config.defaultServer, gameFilename: relPath };
  }
}
