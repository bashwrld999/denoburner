/**
 * State Store
 * 
 * Enhanced state store with selector support and middleware.
 */

import { StateStore as BaseStateStore } from "../core/state-store.ts";
import type { DenoburnerState, StateAction } from "./types.ts";
import { createInitialState, stateReducer } from "./types.ts";

/**
 * Selector function type
 */
export type Selector<T> = (state: DenoburnerState) => T;

/**
 * Middleware function type
 */
export type Middleware = (
  state: DenoburnerState,
  action: StateAction,
  next: (action: StateAction) => DenoburnerState
) => DenoburnerState;

/**
 * State subscriber with selector support
 */
export interface StateSubscriber<T> {
  selector: Selector<T>;
  callback: (value: T, previousValue: T | undefined) => void;
  previousValue?: T;
}

/**
 * Enhanced State Store
 * 
 * Provides:
 * - Redux-like dispatch pattern
 * - Selector-based subscriptions
 * - Middleware support
 */
export class DenoburnerStateStore {
  private state: DenoburnerState;
  private subscribers: StateSubscriber<unknown>[] = [];
  private middlewares: Middleware[] = [];
  private dispatching = false;

  constructor(initialState?: DenoburnerState) {
    this.state = initialState ?? createInitialState();
  }

  /**
   * Get current state
   */
  getState(): DenoburnerState {
    return this.state;
  }

  /**
   * Dispatch an action to update state
   */
  dispatch(action: StateAction): void {
    if (this.dispatching) {
      // Queue the action if already dispatching
      queueMicrotask(() => this.dispatch(action));
      return;
    }

    this.dispatching = true;
    try {
      const previousState = this.state;
      
      // Apply middlewares then reducer
      let newState = this.state;
      for (const middleware of this.middlewares) {
        newState = middleware(previousState, action, (a) => {
          return stateReducer(previousState, a);
        });
      }
      
      // If no middlewares or middlewares didn't modify state, apply reducer
      if (newState === previousState) {
        newState = stateReducer(this.state, action);
      }
      
      this.state = newState;
      
      // Notify subscribers
      this.notifySubscribers(previousState);
    } finally {
      this.dispatching = false;
    }
  }

  /**
   * Subscribe to state changes with a selector
   */
  subscribe<T>(selector: Selector<T>, callback: (value: T, previousValue: T | undefined) => void): () => void {
    const subscriber: StateSubscriber<T> = {
      selector,
      callback,
      previousValue: selector(this.state),
    };
    
    this.subscribers.push(subscriber as StateSubscriber<unknown>);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(subscriber as StateSubscriber<unknown>);
      if (index !== -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to all state changes
   */
  subscribeAll(callback: (state: DenoburnerState) => void): () => void {
    return this.subscribe((s) => s, callback);
  }

  /**
   * Add middleware
   */
  addMiddleware(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Select a value from state
   */
  select<T>(selector: Selector<T>): T {
    return selector(this.state);
  }

  /**
   * Notify subscribers of state changes
   */
  private notifySubscribers(previousState: DenoburnerState): void {
    for (const subscriber of this.subscribers) {
      const newValue = subscriber.selector(this.state);
      const previousValue = subscriber.selector(previousState);
      
      // Only notify if value changed (shallow comparison)
      if (newValue !== previousValue) {
        subscriber.callback(newValue, subscriber.previousValue);
        subscriber.previousValue = newValue;
      }
    }
  }
}

/**
 * Common selectors
 */
export const selectors = {
  // Connection
  isConnected: (state: DenoburnerState) => state.connection.connected,
  connectionState: (state: DenoburnerState) => state.connection.state,
  port: (state: DenoburnerState) => state.connection.port,
  
  // Files
  filesWatched: (state: DenoburnerState) => state.files.watched,
  filesUploaded: (state: DenoburnerState) => state.files.uploaded,
  totalRam: (state: DenoburnerState) => state.files.totalRam,
  lastUpload: (state: DenoburnerState) => state.files.lastUpload,
  trackedFiles: (state: DenoburnerState) => state.files.tracked,
  
  // Queue
  pendingUploads: (state: DenoburnerState) => state.queue.pending,
  failedUploads: (state: DenoburnerState) => state.queue.failed,
  isProcessing: (state: DenoburnerState) => state.queue.processing,
  isOffline: (state: DenoburnerState) => state.queue.offline,
  
  // UI
  uiSize: (state: DenoburnerState) => ({ width: state.ui.width, height: state.ui.height }),
  isRunning: (state: DenoburnerState) => state.ui.running,
  
  // Logs
  logs: (state: DenoburnerState) => state.logs,
};

/**
 * Create a state store
 */
export function createStateStore(initialState?: DenoburnerState): DenoburnerStateStore {
  return new DenoburnerStateStore(initialState);
}
