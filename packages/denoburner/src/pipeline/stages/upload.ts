import type { PipelineStage, PipelineContext } from "../types.ts";
import type { RpcCommandExecutor } from "../../rpc/command.ts";
import { PushFileCommand } from "../../rpc/commands/push_file_command.ts";
import type { FileCache } from "../../state/cache.ts";
import type { UploadQueueManager } from "../../state/queue.ts";
import type { ILogger } from "../../logger/interfaces.ts";

export class UploadStage implements PipelineStage {
  readonly name = "upload";

  constructor(
    private executor: RpcCommandExecutor,
    private cache?: FileCache,
    private queue?: UploadQueueManager,
    private logger?: ILogger,
  ) {}

  async execute(ctx: PipelineContext): Promise<void> {
    if (!ctx.bundledContent) {
      throw new Error("No bundled content to upload");
    }

    if (this.cache) {
      const changed = await this.cache.hasContentChanged(ctx.localPath, ctx.gameServer, ctx.bundledContent);
      if (!changed) {
        ctx.skipped = true;
        ctx.skipReason = "File unchanged";
        return;
      }
    }

    const command = new PushFileCommand({
      filename: ctx.gameFilename,
      content: ctx.bundledContent,
      server: ctx.gameServer,
    });

    try {
      await this.executor.execute(command);
      this.cache?.markUploaded(ctx.localPath, ctx.gameServer, ctx.gameFilename, ctx.bundledContent);
    } catch (err) {
      if (this.queue && this.queue.isOffline()) {
        this.queue.enqueue({
          filePath: ctx.localPath,
          content: ctx.bundledContent,
          gameServer: ctx.gameServer,
          gameFilename: ctx.gameFilename,
        });
        this.logger?.warn(`Queued for retry: ${ctx.gameFilename}`);
      }
      throw err;
    }
  }
}
