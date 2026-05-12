import type { PipelineStage, PipelineContext } from "../types.ts";
import type { ILogger } from "../../logger/interfaces.ts";

export class DryRunUploadStage implements PipelineStage {
  readonly name = "dry_run_upload";

  constructor(private logger: ILogger) {}

  async execute(ctx: PipelineContext): Promise<void> {
    if (!ctx.bundledContent) throw new Error("No bundled content to upload");
    this.logger.info(`[DRY RUN] Would upload: ${ctx.gameServer}/${ctx.gameFilename} (${(ctx.bundledContent.length / 1024).toFixed(1)} KB)`);
  }
}
