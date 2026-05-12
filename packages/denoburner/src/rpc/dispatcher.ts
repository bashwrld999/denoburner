import type { IMessageSender, JsonRpcMessage } from "./types.ts";
import { isRequest, isSuccess, isError } from "./types.ts";
import { RpcRegistry } from "./registry.ts";
import type { PendingRequestMap } from "./pending_requests.ts";
import type { ILogger } from "../logger/interfaces.ts";

export class RpcDispatcher {
  constructor(
    private pending: PendingRequestMap,
    private logger: ILogger,
    registry?: RpcRegistry,
  ) {
    this.registry = registry ?? new RpcRegistry();
  }

  private registry: RpcRegistry;

  async dispatch(data: string, sender: IMessageSender): Promise<void> {
    let msg: JsonRpcMessage;
    try {
      msg = JSON.parse(data);
    } catch {
      this.sendError(sender, -32700, "Parse error", null);
      return;
    }

    if (isRequest(msg)) {
      await this.handleRequest(msg, sender);
    } else if (isSuccess(msg)) {
      this.handleSuccess(msg);
    } else if (isError(msg)) {
      this.handleError(msg);
    } else {
      this.sendError(sender, -32600, "Invalid Request", msg);
    }
  }

  private async handleRequest(
    msg: { jsonrpc: "2.0"; id: number; method: string; params?: unknown },
    sender: IMessageSender,
  ): Promise<void> {
    const handler = this.registry.get(msg.method);
    if (!handler) {
      this.logger.warn(`No handler for method: ${msg.method}`);
      this.sendError(sender, -32601, `Method not found: ${msg.method}`, msg.id);
      return;
    }

    try {
      await handler.handle(msg.params, sender, msg.id);
    } catch (err) {
      this.logger.error(`Handler error for ${msg.method}: ${err instanceof Error ? err.stack || err.message : err}`);
      this.sendError(sender, -32603, `Internal error: ${err instanceof Error ? err.message : err}`, msg.id);
    }
  }

  private handleSuccess(msg: { id: number; result: unknown }): void {
    this.logger.info(`RPC ← Success (#${msg.id})`);
    this.pending.resolve(msg.id, msg.result);
  }

  private handleError(msg: { id: number; error: { code?: number; message?: string } }): void {
    const code = msg.error.code ?? -1;
    const message = msg.error.message ?? "Unknown error";
    this.logger.error(`RPC ← Error #${msg.id}: ${code} ${message}`);
    this.pending.reject(msg.id, new Error(`${message}`));
  }

  private sendError(sender: IMessageSender, code: number, message: string, id: unknown): void {
    sender.send(JSON.stringify({
      jsonrpc: "2.0",
      id: typeof id === "number" ? id : null,
      error: { code, message },
    }));
  }
}
