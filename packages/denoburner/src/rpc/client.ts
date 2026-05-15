import type { IMessageSender } from "./types.ts";
import type { PendingRequestMap } from "./pending_requests.ts";
import type { ILogger } from "../logger/interfaces.ts";
import { toDenoburnerError } from "../core/errors.ts";

export interface IRpcClient {
  sendRequest<T = unknown>(method: string, params?: unknown): Promise<T>;
}

export class RpcClient implements IRpcClient {
  private sender: IMessageSender | null = null;
  private buffer: string[] = [];

  constructor(
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
      if (this.sender) {
        this.sender.send(request);
      } else {
        this.buffer.push(request);
        this.logger.warn(`RPC → ${method} (#${id}) buffered (no connection)`);
      }
      const result = await promise;
      return result as T;
    } catch (err) {
      const e = toDenoburnerError(err);
      this.logger.error(`RPC ✗ ${method}: ${e.message}`);
      throw e;
    }
  }

  setSender(sender: IMessageSender | null): void {
    this.sender = sender;
    if (sender && this.buffer.length > 0) {
      for (const msg of this.buffer) {
        sender.send(msg);
      }
      this.buffer = [];
    }
  }
}
