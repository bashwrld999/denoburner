import type { PipelineStage, PipelineContext } from "../types.ts";
import type { RpcCommandExecutor } from "../../rpc/command.ts";
import { CalculateRamCommand } from "../../rpc/commands/calculate_ram_command.ts";

export class RamCheckStage implements PipelineStage {
  readonly name = "ram_check";

  constructor(private executor: RpcCommandExecutor) {}

  async execute(ctx: PipelineContext): Promise<void> {
    if (!ctx.gameFilename) {
      throw new Error("No game filename set");
    }

    try {
      const command = new CalculateRamCommand({
        filename: ctx.gameFilename,
        server: ctx.gameServer,
      });
      const result = await this.executor.execute(command);
      ctx.ramCost = result.ram;
    } catch {
      ctx.ramCost = 0;
    }
  }
}
