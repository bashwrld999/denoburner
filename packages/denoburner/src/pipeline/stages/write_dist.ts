import { dirname, join } from "@std/path";
import { ensureDir } from "@std/fs";
import type { PipelineStage, PipelineContext } from "../types.ts";

export class WriteDistStage implements PipelineStage {
  readonly name = "write_dist";

  constructor(private outDir: string) {}

  async execute(ctx: PipelineContext): Promise<void> {
    if (!ctx.bundledContent) {
      throw new Error("No bundled content to write");
    }

    const gameFilename = /\.tsx?$/i.test(ctx.gameFilename)
      ? ctx.gameFilename.replace(/\.tsx?$/i, ".js")
      : ctx.gameFilename;
    const outPath = join(this.outDir, ctx.gameServer, gameFilename);

    const outDirPath = dirname(outPath);
    await ensureDir(outDirPath);

    await Deno.writeTextFile(outPath, ctx.bundledContent);
    ctx.outPath = outPath;
  }
}
