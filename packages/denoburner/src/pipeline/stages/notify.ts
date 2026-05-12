import type { PipelineStage, PipelineContext } from "../types.ts";
import type { ITuiEventBus } from "../../tui/interfaces.ts";

export class NotifyStage implements PipelineStage {
  readonly name = "notify";

  constructor(private eventBus: ITuiEventBus) {}

  async execute(ctx: PipelineContext): Promise<void> {
    if (ctx.error) {
      this.eventBus.emit({
        type: "file_error",
        filename: ctx.gameFilename,
        server: ctx.gameServer,
        error: ctx.error.message,
      });
      return;
    }

    if (ctx.skipped) {
      this.eventBus.emit({
        type: "file_skipped",
        filename: ctx.gameFilename,
        reason: ctx.skipReason ?? "unknown",
      });
      return;
    }

    const duration = ctx.finishedAt && ctx.startedAt
      ? ctx.finishedAt - ctx.startedAt
      : 0;

    this.eventBus.emit({
      type: "file_uploaded",
      filename: ctx.gameFilename,
      server: ctx.gameServer,
      ram: ctx.ramCost ?? 0,
      durationMs: duration,
    });
  }
}
