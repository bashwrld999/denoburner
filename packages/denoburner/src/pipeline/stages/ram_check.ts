import type { PipelineStage, PipelineContext } from "../types.ts";
import type { RpcCommandExecutor } from "../../rpc/command.ts";

/** Single-attempt RAM check — if it fails, defaults to 0 GB with no retries. */
export class RamCheckStage implements PipelineStage {
  readonly name = "ram_check";

  constructor(private executor: RpcCommandExecutor) {}

  async execute(ctx: PipelineContext): Promise<void> {
    if (!ctx.gameFilename) return;

    try {
      const raw = await this.executor.client.sendRequest("calculateRam", {
        filename: ctx.gameFilename,
        server: ctx.gameServer,
      });
      const result = typeof raw === "object" && raw !== null
        ? (raw as { ram?: number }).ram
        : undefined;
      ctx.ramCost = typeof result === "number" ? result : 0;
    } catch {
      ctx.ramCost = 0;
    }
  }
}
