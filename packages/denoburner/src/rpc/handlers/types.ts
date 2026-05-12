import type { IMessageSender } from "../types.ts";

export interface IRpcHandler<Params = unknown, Result = unknown> {
  readonly method: string;
  handle(params: Params, sender: IMessageSender, requestId: number): void | Promise<void>;
}
