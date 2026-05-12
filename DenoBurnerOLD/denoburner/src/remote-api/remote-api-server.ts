/**
 * Remote API Server
 * 
 * Main orchestrator for Bitburner Remote API communication.
 * Combines transport, protocol, API, and state management.
 */

import type { Transport } from "./interfaces/transport.ts";
import type { ConnectionState } from "./types.ts";
import { JsonRpcClient } from "./protocol/json-rpc-client.ts";
import { RequestManager } from "./protocol/request-manager.ts";
import { BitburnerApi } from "./api/bitburner-api.ts";
import { ConnectionStateManager } from "./state/connection-state-manager.ts";

/**
 * Remote API Server options
 */
export interface RemoteApiServerOptions {
  /** Transport implementation */
  transport: Transport;
  /** Port to listen on */
  port: number;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Remote API Server callbacks
 */
export interface RemoteApiServerCallbacks {
  onConnection?: () => void;
  onDisconnection?: () => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: ConnectionState) => void;
}

/**
 * Remote API Server
 * 
 * Orchestrates all components for Bitburner Remote API communication.
 * 
 * Usage:
 * ```typescript
 * const server = new RemoteApiServer({
 *   transport: new WebSocketTransport(),
 *   port: 12525,
 * });
 * 
 * server.on({ onConnection: () => console.log('Connected!') });
 * await server.start();
 * 
 * const api = server.getApi();
 * await api.pushFile('home', 'script.js', 'code');
 * ```
 */
export class RemoteApiServer {
  private transport: Transport;
  private port: number;
  private timeout: number;
  
  private stateManager: ConnectionStateManager;
  private requestManager: RequestManager;
  private client: JsonRpcClient;
  private api: BitburnerApi;
  
  private callbacks: RemoteApiServerCallbacks = {};

  constructor(options: RemoteApiServerOptions) {
    this.transport = options.transport;
    this.port = options.port;
    this.timeout = options.timeout ?? 10000;
    
    // Initialize state manager
    this.stateManager = new ConnectionStateManager();
    this.stateManager.setCallbacks({
      onEnter: (state) => this.callbacks.onStateChange?.(state),
    });
    
    // Initialize protocol layer
    this.requestManager = new RequestManager(this.timeout);
    this.client = new JsonRpcClient(this.transport, this.requestManager);
    
    // Initialize API layer
    this.api = new BitburnerApi(this.client, this.timeout);
    
    // Set up client callbacks to forward to server callbacks
    this.client.setCallbacks({
      onConnection: () => {
        this.stateManager.transition("connected");
        this.callbacks.onConnection?.();
      },
      onDisconnection: () => {
        this.stateManager.transition("disconnected");
        this.callbacks.onDisconnection?.();
      },
      onError: (error) => {
        this.stateManager.transition("error");
        this.callbacks.onError?.(error);
      },
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    await this.transport.start(this.port);
    this.stateManager.transition("listening");
  }

  /**
   * Stop the server
   */
  stop(): void {
    this.transport.stop();
    this.stateManager.reset();
  }

  /**
   * Get the Bitburner API
   */
  getApi(): BitburnerApi {
    return this.api;
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.stateManager.getState();
  }

  /**
   * Check if connected to Bitburner
   */
  isConnected(): boolean {
    return this.stateManager.isConnected();
  }

  /**
   * Set callbacks for server events
   */
  on(callbacks: RemoteApiServerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Clear all callbacks
   */
  off(): void {
    this.callbacks = {};
  }

  /**
   * Wait for connection
   * Returns a promise that resolves when connected
   */
  waitForConnection(timeout?: number): Promise<void> {
    if (this.isConnected()) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeoutId = timeout
        ? setTimeout(() => {
            this.callbacks.onConnection = undefined;
            reject(new Error("Connection timeout"));
          }, timeout)
        : undefined;

      const originalCallback = this.callbacks.onConnection;
      this.callbacks.onConnection = () => {
        if (timeoutId) clearTimeout(timeoutId);
        originalCallback?.();
        resolve();
      };
    });
  }
}
