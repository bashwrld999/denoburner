/**
 * Remote API Factory
 * 
 * Factory functions for creating Remote API instances.
 */

import { RemoteApiServer } from "./remote-api-server.ts";
import { WebSocketTransport } from "./transport/websocket-transport.ts";
import type { RemoteApiServerOptions, RemoteApiServerCallbacks } from "./remote-api-server.ts";

/**
 * Create a Remote API Server with WebSocket transport
 */
export function createRemoteApiServer(
  port: number = 12525,
  timeout: number = 10000,
  callbacks?: RemoteApiServerCallbacks
): RemoteApiServer {
  const server = new RemoteApiServer({
    transport: new WebSocketTransport(),
    port,
    timeout,
  });

  if (callbacks) {
    server.on(callbacks);
  }

  return server;
}

/**
 * Create a custom Remote API Server with a specific transport
 */
export function createCustomRemoteApiServer(
  options: RemoteApiServerOptions,
  callbacks?: RemoteApiServerCallbacks
): RemoteApiServer {
  const server = new RemoteApiServer(options);

  if (callbacks) {
    server.on(callbacks);
  }

  return server;
}
