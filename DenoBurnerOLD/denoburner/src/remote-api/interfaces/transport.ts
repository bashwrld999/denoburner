/**
 * Transport Interface
 * 
 * Strategy pattern for different transport implementations.
 */

import type { ConnectionState } from "../types.ts";

/**
 * Transport event callbacks
 */
export interface TransportCallbacks {
  /** Called when a message is received */
  onMessage: (data: string) => void;
  /** Called when connection is established */
  onConnection: () => void;
  /** Called when connection is lost */
  onDisconnection: () => void;
  /** Called when an error occurs */
  onError: (error: Error) => void;
}

/**
 * Transport Interface
 * 
 * Abstracts the communication layer for the Remote API.
 * Implementations can use different transport mechanisms:
 * - WebSocket (production)
 * - Mock (testing)
 * - IPC (future)
 */
export interface Transport {
  /**
   * Transport name for identification
   */
  readonly name: string;

  /**
   * Start the transport
   * @param port - Port to listen on
   */
  start(port: number): Promise<void>;

  /**
   * Stop the transport
   */
  stop(): void;

  /**
   * Send data through the transport
   * @param data - Data to send
   */
  send(data: string): void;

  /**
   * Check if transport is connected
   */
  isConnected(): boolean;

  /**
   * Get current connection state
   */
  getState(): ConnectionState;

  /**
   * Register event callbacks
   * @param callbacks - Event callbacks
   */
  on(callbacks: TransportCallbacks): void;

  /**
   * Unregister event callbacks
   */
  off(): void;
}
