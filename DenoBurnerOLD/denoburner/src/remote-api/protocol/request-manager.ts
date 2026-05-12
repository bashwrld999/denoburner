/**
 * Request Manager
 * 
 * Manages JSON-RPC request lifecycle with timeout handling.
 */

import type { JsonRpcRequest, JsonRpcResponse } from "../types.ts";

/**
 * Pending request
 */
interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: number;
}

/**
 * Request Manager
 * 
 * Handles JSON-RPC request/response correlation with timeout management.
 */
export class RequestManager {
  private requestId = 0;
  private pending = new Map<number, PendingRequest>();
  private defaultTimeout: number;

  constructor(defaultTimeout: number = 10000) {
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Create a new JSON-RPC request
   */
  createRequest(method: string, params: Record<string, unknown>): JsonRpcRequest {
    const id = ++this.requestId;
    return {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };
  }

  /**
   * Register a pending request
   * Returns a promise that resolves when the response is received
   */
  registerRequest<T>(id: number, timeout?: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timeout (id: ${id})`));
      }, timeout ?? this.defaultTimeout);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout: timeoutId,
      });
    });
  }

  /**
   * Handle an incoming response
   */
  handleResponse(response: JsonRpcResponse): boolean {
    const pending = this.pending.get(response.id);

    if (!pending) {
      return false;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(response.id);

    if (response.error) {
      const errorMsg = response.error.message 
        ?? (typeof response.error.data === 'string' ? response.error.data : JSON.stringify(response.error))
        ?? 'Unknown error';
      pending.reject(new Error(errorMsg));
    } else {
      pending.resolve(response.result);
    }

    return true;
  }

  /**
   * Reject all pending requests
   */
  rejectAll(error: Error): void {
    for (const [id, { reject, timeout }] of this.pending) {
      clearTimeout(timeout);
      reject(error);
      this.pending.delete(id);
    }
  }

  /**
   * Get number of pending requests
   */
  getPendingCount(): number {
    return this.pending.size;
  }

  /**
   * Check if there are pending requests
   */
  hasPending(): boolean {
    return this.pending.size > 0;
  }
}
