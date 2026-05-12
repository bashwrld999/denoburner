/**
 * Types for Bitburner Remote API
 * 
 * The Remote API works by:
 * 1. Denoburner creates a WebSocket SERVER
 * 2. Bitburner connects to our server (when configured in game)
 * 3. We send JSON-RPC requests to Bitburner
 * 4. Bitburner responds with results
 */

// JSON-RPC 2.0 types
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: Record<string, unknown>;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params: Record<string, unknown>;
}

// Bitburner API methods
export interface PushFileParams {
  [key: string]: unknown;
  server: string;
  filename: string;
  content: string;
}

export interface DeleteFileParams {
  [key: string]: unknown;
  server: string;
  filename: string;
}

export interface GetFileParams {
  [key: string]: unknown;
  server: string;
  filename: string;
}

export interface GetFileNamesParams {
  [key: string]: unknown;
  server: string;
}

export interface GetAllFilesParams {
  [key: string]: unknown;
  server: string;
}

export interface GetScriptRamParams {
  [key: string]: unknown;
  server: string;
  filename: string;
}

// API response types
export type GetFileResult = string;
export type GetFileNamesResult = string[];
export type GetAllFilesResult = Array<{ filename: string; content: string }>;
export type GetScriptRamResult = number;
export type GetDefinitionFileResult = string;

// Connection state
export type ConnectionState = "disconnected" | "listening" | "connected" | "error";

// Server options
export interface RemoteApiOptions {
  port: number;
  timeout: number;
}
