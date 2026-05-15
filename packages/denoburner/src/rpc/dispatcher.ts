import type { IMessageSender, JsonRpcMessage } from "./types.ts";
import { isRequest, isSuccess, isError } from "./types.ts";
import type { PendingRequestMap } from "./pending_requests.ts";
import type { ILogger } from "../logger/interfaces.ts";

export class RpcDispatcher {
  constructor(
    private pending: PendingRequestMap,
    private logger: ILogger,
  ) {}

  async dispatch(data: string, sender: IMessageSender): Promise<void> {
    let msg: JsonRpcMessage;
    try {
      msg = JSON.parse(data);
    } catch {
      this.sendError(sender, -32700, "Parse error", null);
      return;
    }

    if (isRequest(msg)) {
      this.sendError(sender, -32601, `Method not found: ${msg.method}`, msg.id);
    } else if (isSuccess(msg)) {
      this.handleSuccess(msg);
    } else if (isError(msg)) {
      this.handleError(msg);
    } else {
      this.sendError(sender, -32600, "Invalid Request", msg);
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
    this.pending.reject(msg.id, new Error(message));
  }

  private sendError(sender: IMessageSender, code: number, message: string, id: unknown): void {
    sender.send(JSON.stringify({
      jsonrpc: "2.0",
      id: typeof id === "number" ? id : null,
      error: { code, message },
    }));
  }
}
