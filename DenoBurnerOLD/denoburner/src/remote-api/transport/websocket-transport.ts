/**
 * WebSocket Transport
 * 
 * Transport implementation using WebSocket.
 */

import type { Transport, TransportCallbacks } from "../interfaces/index.ts";
import type { ConnectionState } from "../types.ts";

/**
 * WebSocket Transport
 * 
 * Implements the Transport interface using Deno's WebSocket API.
 * Creates a WebSocket server that Bitburner connects to.
 */
export class WebSocketTransport implements Transport {
  readonly name = "websocket";

  private abortController: AbortController | null = null;
  private socket: WebSocket | null = null;
  private callbacks: TransportCallbacks | null = null;
  private _state: ConnectionState = "disconnected";
  private _port: number = 12525;

  async start(port: number): Promise<void> {
    if (this.abortController) {
      return;
    }

    this._port = port;
    this.abortController = new AbortController();
    this._state = "listening";

    // Start HTTP server for WebSocket upgrade
    const handler = async (request: Request): Promise<Response> => {
      // Handle WebSocket upgrade
      if (request.headers.get("upgrade")?.toLowerCase() === "websocket") {
        const { socket, response } = Deno.upgradeWebSocket(request);
        this.setupSocket(socket);
        return response;
      }

      // Regular HTTP request - return info
      return new Response("Denoburner Remote API Server - Connect via WebSocket", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    };

    // Start server in background
    Deno.serve({
      port,
      signal: this.abortController.signal,
      onListen: () => {
        // Server is listening
      },
    }, handler);
  }

  stop(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this._state = "disconnected";
  }

  send(data: string): void {
    if (!this.isConnected()) {
      throw new Error("Transport is not connected");
    }
    this.socket!.send(data);
  }

  isConnected(): boolean {
    return this._state === "connected" && this.socket?.readyState === WebSocket.OPEN;
  }

  getState(): ConnectionState {
    return this._state;
  }

  on(callbacks: TransportCallbacks): void {
    this.callbacks = callbacks;
  }

  off(): void {
    this.callbacks = null;
  }

  private setupSocket(socket: WebSocket): void {
    this.socket = socket;

    socket.onopen = () => {
      this._state = "connected";
      this.callbacks?.onConnection();
    };

    socket.onclose = () => {
      this.socket = null;
      this._state = "listening";
      this.callbacks?.onDisconnection();
    };

    socket.onerror = () => {
      const error = new Error("WebSocket error");
      this.callbacks?.onError(error);
    };

    socket.onmessage = (event) => {
      this.callbacks?.onMessage(event.data);
    };
  }
}
