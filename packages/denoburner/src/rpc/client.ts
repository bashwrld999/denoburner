import type { IMessageSender } from "./types.ts";
import type { PendingRequestMap } from "./pending_requests.ts";
import type { ILogger } from "../logger/interfaces.ts";

export interface IRpcClient {
  sendRequest<T = unknown>(method: string, params?: unknown): Promise<T>;
}

export class RpcClient implements IRpcClient {
  constructor(
    private sender: IMessageSender,
    private pending: PendingRequestMap,
    private logger: ILogger,
  ) {}

  async sendRequest<T = unknown>(method: string, params?: unknown): Promise<T> {
    const { id, promise } = this.pending.add(method);
    const request = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params,
    });

    this.logger.info(`RPC → ${method} (#${id})`);

    try {
      this.sender.send(request);
      const result = await promise;
      return result as T;
    } catch (err) {
      this.logger.error(`RPC ✗ ${method}: ${err}`);
      throw err;
    }
  }

  setSender(sender: IMessageSender): void {
    this.sender = sender;
  }
}
