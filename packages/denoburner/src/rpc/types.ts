export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
}

export interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: number;
  result: unknown;
}

export interface JsonRpcError {
  jsonrpc: "2.0";
  id: number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcSuccess | JsonRpcError;

export interface IMessageSender {
  send(message: string): void;
}

export function isRequest(msg: JsonRpcMessage): msg is JsonRpcRequest {
  return "method" in msg && typeof (msg as JsonRpcRequest).method === "string";
}

export function isSuccess(msg: JsonRpcMessage): msg is JsonRpcSuccess {
  return "result" in msg && !("method" in msg);
}

export function isError(msg: JsonRpcMessage): msg is JsonRpcError {
  return "error" in msg && typeof (msg as JsonRpcError).error === "object";
}
