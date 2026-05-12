/**
 * State Store Implementation
 * 
 * Observer pattern for state management.
 */

import type { StateStore, TuiState, StateSubscriber } from "../interfaces/index.ts";

/**
 * Initial TUI state
 */
export const initialTuiState: TuiState = {
  connection: {
    connected: false,
    port: 12525,
    connectedAt: undefined,
  },
  files: {
    watched: 0,
    uploaded: 0,
    totalRam: 0,
    lastUpload: null,
    list: [],
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
  },
  queue: {
    pending: 0,
    items: [],
  },
  logs: [],
  ui: {
    width: 120,
    height: 30,
    running: false,
    expandedServers: ["home"], // Home expanded by default
    logLevelFilter: "all", // Show all logs by default
  },
};

/**
 * TUI State Store
 * 
 * Provides reactive state management for TUI components.
 */
export class TuiStateStore implements StateStore {
  private state: TuiState;
  private subscribers: Set<StateSubscriber> = new Set();

  constructor(initialState: TuiState = initialTuiState) {
    this.state = { ...initialState };
  }

  getState(): TuiState {
    return { ...this.state };
  }

  setState(partial: Partial<TuiState>): void {
    const changedKeys = Object.keys(partial);
    this.state = { ...this.state, ...partial };
    this.notify(changedKeys);
  }

  subscribe(subscriber: StateSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  select<R>(selector: (state: TuiState) => R): R {
    return selector(this.getState());
  }

  reset(): void {
    this.state = { ...initialTuiState };
    this.notify(Object.keys(initialTuiState));
  }

  private notify(changedKeys: string[]): void {
    const state = this.getState();
    for (const subscriber of this.subscribers) {
      try {
        subscriber(state, changedKeys);
      } catch (error) {
        console.error("State subscriber error:", error);
      }
    }
  }
}

/**
 * Create a new state store
 */
export function createStateStore(initialState?: TuiState): StateStore {
  return new TuiStateStore(initialState);
}
