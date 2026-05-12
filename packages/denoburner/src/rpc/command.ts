import type { IRpcClient } from "./client.ts";
import type { ILogger } from "../logger/interfaces.ts";
import { retry } from "../core/retry.ts";

export interface RpcCommand<T> {
  readonly method: string;
  readonly params: unknown;
  parseResponse(raw: unknown): T;
}

export class RpcCommandExecutor {
  constructor(
    private rpcClient: IRpcClient,
    private logger: ILogger,
    private maxRetries: number = 2,
  ) {}

  async execute<T>(command: RpcCommand<T>): Promise<T> {
    return retry(
      async () => {
        this.logger.info(`→ ${command.method}`);
        const raw = await this.rpcClient.sendRequest(command.method, command.params);
        const result = command.parseResponse(raw);
        this.logger.info(`← ${command.method} OK`);
        return result;
      },
      { maxRetries: this.maxRetries, baseDelayMs: 200 },
    );
  }
}
