/**
 * Bitburner Remote API Server
 * 
 * Creates a WebSocket SERVER that Bitburner connects to.
 * 
 * How it works:
 * 1. We start a WebSocket server on the specified port
 * 2. User configures Bitburner to connect to our server
 * 3. When Bitburner connects, we can send JSON-RPC requests
 * 4. Bitburner executes the requests and responds
 */

import { EventEmitter } from "../core/event-emitter.ts";
import {
  ConnectionState,
  JsonRpcRequest,
  JsonRpcResponse,
  RemoteApiOptions,
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
} from "./types.ts";

const DEFAULT_OPTIONS: RemoteApiOptions = {
  port: 12525,
  timeout: 10000,
};

/**
 * Remote API event map
 */
export interface RemoteApiEventMap {
  "connection:change": { state: ConnectionState };
  "client:connected": {};
  "client:disconnected": {};
  "connection:error": { error: Error };
  "file:uploaded": { server: string; filename: string };
  "file:deleted": { server: string; filename: string };
}

/**
 * Bitburner Remote API Server
 * 
 * @example
 * ```ts
 * const server = new RemoteApiServer({ port: 12525 });
 * await server.start();
 * // Wait for Bitburner to connect...
 * await server.pushFile("home", "test.js", "console.log('hello')");
 * ```
 */
export class RemoteApiServer extends EventEmitter<RemoteApiEventMap> {
  private abortController: AbortController | null = null;
  private socket: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: number;
  }>();
  
  private _state: ConnectionState = "disconnected";
  
  constructor(private options: RemoteApiOptions = DEFAULT_OPTIONS) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Get current connection state
   */
  get state(): ConnectionState {
    return this._state;
  }

  /**
   * Check if Bitburner is connected
   */
  get isConnected(): boolean {
    return this._state === "connected" && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Update connection state and emit event
   */
  private setState(state: ConnectionState): void {
    this._state = state;
    this.emit("connection:change", { state });
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    if (this.abortController) {
      return;
    }

    this.abortController = new AbortController();
    this.setState("listening");

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
      port: this.options.port,
      signal: this.abortController.signal,
      onListen: () => {
        //console.log(`Remote API server listening on port ${this.options.port}`);
      },
    }, handler);
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupSocket(socket: WebSocket): void {
    this.socket = socket;

    socket.onopen = () => {
      this.setState("connected");
      this.emit("client:connected", {});
    };

    socket.onclose = () => {
      this.socket = null;
      this.setState("listening");
      this.emit("client:disconnected", {});
      
      // Reject all pending requests
      for (const [id, { reject, timeout }] of this.pendingRequests) {
        clearTimeout(timeout);
        reject(new Error("Connection closed"));
        this.pendingRequests.delete(id);
      }
    };

    socket.onerror = () => {
      const error = new Error("WebSocket error");
      this.emit("connection:error", { error });
    };

    socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Stop the server
   */
  stop(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.setState("disconnected");
  }

  /**
   * Wait for Bitburner to connect
   */
  async waitForConnection(timeout = 30000): Promise<void> {
    if (this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Timeout waiting for Bitburner connection"));
      }, timeout);

      const unsubscribe = this.on("client:connected", () => {
        clearTimeout(timer);
        unsubscribe();
        resolve();
      });

      this.on("connection:error", ({ error }) => {
        clearTimeout(timer);
        unsubscribe();
        reject(error);
      });
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const response: JsonRpcResponse = JSON.parse(data);
      const pending = this.pendingRequests.get(response.id);
      
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id);
        
        if (response.error) {
          // Handle error - message might be undefined or nested
          const errorMsg = response.error.message 
            ?? (typeof response.error.data === 'string' ? response.error.data : JSON.stringify(response.error))
            ?? 'Unknown error';
          pending.reject(new Error(errorMsg));
        } else {
          pending.resolve(response.result);
        }
      }
    } catch (error) {
      console.error("Failed to parse response:", error);
    }
  }

  /**
   * Send JSON-RPC request to Bitburner
   */
  private async sendRequest<T>(method: string, params: Record<string, unknown>): Promise<T> {
    if (!this.isConnected) {
      throw new Error("Bitburner is not connected");
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout for ${method}`));
      }, this.options.timeout);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout: timeoutId,
      });

      this.socket!.send(JSON.stringify(request));
    });
  }

  // File operations

  /**
   * Upload a file to Bitburner
   */
  async pushFile(server: string, filename: string, content: string): Promise<void> {
    await this.sendRequest<void>("pushFile", { server, filename, content });
    this.emit("file:uploaded", { server, filename });
  }

  /**
   * Delete a file from Bitburner
   */
  async deleteFile(server: string, filename: string): Promise<void> {
    await this.sendRequest<void>("deleteFile", { server, filename });
    this.emit("file:deleted", { server, filename });
  }

  /**
   * Get a file's content from Bitburner
   */
  async getFile(server: string, filename: string): Promise<GetFileResult> {
    return this.sendRequest<GetFileResult>("getFile", { server, filename });
  }

  /**
   * List all files on a server
   */
  async getFileNames(server: string): Promise<GetFileNamesResult> {
    return this.sendRequest<GetFileNamesResult>("getFileNames", { server });
  }

  /**
   * Get all files from a server
   */
  async getAllFiles(server: string): Promise<GetAllFilesResult> {
    return this.sendRequest<GetAllFilesResult>("getAllFiles", { server });
  }

  /**
   * Get RAM usage for a script
   */
  async getScriptRam(server: string, filename: string): Promise<GetScriptRamResult> {
    return this.sendRequest<GetScriptRamResult>("calculateRam", { server, filename });
  }

  /**
   * Get the Bitburner NS definition file (for TypeScript types)
   */
  async getDefinitionFile(): Promise<GetDefinitionFileResult> {
    return this.sendRequest<GetDefinitionFileResult>("getDefinitionFile", {});
  }
}

// Export types
export * from "./types.ts";
