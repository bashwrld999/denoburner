/**
 * Remote API Module
 * 
 * Provides Bitburner Remote API communication.
 * 
 * Architecture:
 * - Transport: Strategy pattern for communication layer (WebSocket, Mock)
 * - Protocol: JSON-RPC 2.0 client implementation
 * - API: Facade pattern for Bitburner operations
 * - State: State pattern for connection lifecycle
 * - Server: Orchestrator combining all components
 * 
 * Usage:
 * ```typescript
 * import { createRemoteApiServer } from './remote-api';
 * 
 * const server = createRemoteApiServer(12525, 10000, {
 *   onConnection: () => console.log('Connected!'),
 * });
 * 
 * await server.start();
 * 
 * const api = server.getApi();
 * await api.pushFile('home', 'script.js', 'code');
 * ```
 */

// Types
export type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
  PushFileParams,
  DeleteFileParams,
  GetFileParams,
  GetFileNamesParams,
  GetAllFilesParams,
  GetScriptRamParams,
  GetFileResult,
  GetFileNamesResult,
  GetAllFilesResult,
  GetScriptRamResult,
  GetDefinitionFileResult,
  ConnectionState,
  RemoteApiOptions,
} from "./types.ts";

// Interfaces
export type { Transport, TransportCallbacks } from "./interfaces/transport.ts";

// Transport implementations
export { WebSocketTransport } from "./transport/index.ts";

// Protocol layer
export { RequestManager, JsonRpcClient } from "./protocol/index.ts";
export type { JsonRpcClientCallbacks } from "./protocol/index.ts";

// API layer
export { BitburnerApi } from "./api/index.ts";
export type { FileData } from "./api/index.ts";

// State management
export { ConnectionStateManager } from "./state/index.ts";
export type { StateCallbacks } from "./state/index.ts";

// Server
export { RemoteApiServer } from "./remote-api-server.ts";
export type { RemoteApiServerOptions, RemoteApiServerCallbacks } from "./remote-api-server.ts";

// Factory functions
export {
  createRemoteApiServer,
  createCustomRemoteApiServer,
} from "./factory.ts";
