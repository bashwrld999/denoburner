import type { PipelineStage, PipelineContext } from "../types.ts";

export class ReadFileStage implements PipelineStage {
  readonly name = "read_file";

  async execute(ctx: PipelineContext): Promise<void> {
    const content = await Deno.readTextFile(ctx.localPath);
    ctx.rawContent = content;
    ctx.byteSize = new TextEncoder().encode(content).length;
  }
}
