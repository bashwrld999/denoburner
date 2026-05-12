/**
 * Connection State Manager
 * 
 * State pattern for managing connection lifecycle.
 */

import type { ConnectionState } from "../types.ts";

/**
 * State transition callbacks
 */
export interface StateCallbacks {
  onEnter?: (state: ConnectionState) => void;
  onExit?: (state: ConnectionState) => void;
}

/**
 * Connection State Manager
 * 
 * Manages connection state transitions with validation and callbacks.
 */
export class ConnectionStateManager {
  private state: ConnectionState = "disconnected";
  private callbacks: StateCallbacks = {};
  private previousState: ConnectionState | null = null;

  /**
   * Get current state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get previous state
   */
  getPreviousState(): ConnectionState | null {
    return this.previousState;
  }

  /**
   * Set callbacks for state transitions
   */
  setCallbacks(callbacks: StateCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Transition to a new state
   * Returns true if transition was successful
   */
  transition(newState: ConnectionState): boolean {
    if (!this.isValidTransition(this.state, newState)) {
      return false;
    }

    const oldState = this.state;
    this.previousState = oldState;
    this.state = newState;

    // Fire callbacks
    this.callbacks.onExit?.(oldState);
    this.callbacks.onEnter?.(newState);

    return true;
  }

  /**
   * Check if a transition is valid
   */
  private isValidTransition(from: ConnectionState, to: ConnectionState): boolean {
    // Define valid transitions
    const validTransitions: Record<ConnectionState, ConnectionState[]> = {
      disconnected: ["listening", "error"],
      listening: ["connected", "disconnected", "error"],
      connected: ["disconnected", "error"],
      error: ["disconnected", "listening"],
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.state === "connected";
  }

  /**
   * Check if currently listening
   */
  isListening(): boolean {
    return this.state === "listening";
  }

  /**
   * Check if in error state
   */
  isError(): boolean {
    return this.state === "error";
  }

  /**
   * Reset to disconnected state
   */
  reset(): void {
    this.previousState = this.state;
    this.state = "disconnected";
  }
}
