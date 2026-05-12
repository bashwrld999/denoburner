/**
 * JSON-RPC Client
 * 
 * High-level JSON-RPC client for Bitburner communication.
 */

import type { Transport } from "../interfaces/transport.ts";
import type { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from "../types.ts";
import { RequestManager } from "./request-manager.ts";

/**
 * JSON-RPC Client callbacks
 */
export interface JsonRpcClientCallbacks {
  onNotification?: (notification: JsonRpcNotification) => void;
  onError?: (error: Error) => void;
  onConnection?: () => void;
  onDisconnection?: () => void;
}

/**
 * JSON-RPC Client
 * 
 * Provides a high-level API for JSON-RPC communication over a transport.
 */
export class JsonRpcClient {
  private transport: Transport;
  private requestManager: RequestManager;
  private callbacks: JsonRpcClientCallbacks = {};

  constructor(transport: Transport, requestManager?: RequestManager) {
    this.transport = transport;
    this.requestManager = requestManager ?? new RequestManager();
    
    // Set up transport callbacks
    this.transport.on({
      onMessage: (data) => this.handleMessage(data),
      onError: (error) => this.callbacks.onError?.(error),
      onConnection: () => {
        this.callbacks.onConnection?.();
      },
      onDisconnection: () => {
        // Reject all pending requests on disconnection
        this.requestManager.rejectAll(new Error("Connection lost"));
        this.callbacks.onDisconnection?.();
      },
    });
  }

  /**
   * Set callbacks for notifications and errors
   */
  setCallbacks(callbacks: JsonRpcClientCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Send a JSON-RPC request and wait for response
   */
  async call<T>(method: string, params: Record<string, unknown>, timeout?: number): Promise<T> {
    if (!this.transport.isConnected()) {
      throw new Error("Transport not connected");
    }

    const request = this.requestManager.createRequest(method, params);
    const responsePromise = this.requestManager.registerRequest<T>(request.id as number, timeout);

    this.transport.send(JSON.stringify(request));

    return responsePromise;
  }

  /**
   * Send a JSON-RPC notification (no response expected)
   */
  notify(method: string, params: Record<string, unknown>): void {
    if (!this.transport.isConnected()) {
      throw new Error("Transport not connected");
    }

    const notification: JsonRpcNotification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    this.transport.send(JSON.stringify(notification));
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as JsonRpcResponse | JsonRpcNotification;

      // Check if it's a response (has id) or notification (no id)
      if ("id" in message) {
        // It's a response
        this.requestManager.handleResponse(message as JsonRpcResponse);
      } else {
        // It's a notification
        this.callbacks.onNotification?.(message as JsonRpcNotification);
      }
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get number of pending requests
   */
  getPendingCount(): number {
    return this.requestManager.getPendingCount();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.transport.isConnected();
  }
}
