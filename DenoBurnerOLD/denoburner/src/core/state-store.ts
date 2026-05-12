/**
 * StateStore - Centralized state management with reactive updates
 * 
 * Provides a single source of truth for application state with
 * type-safe updates and subscription-based change notifications.
 * 
 * @example
 * ```ts
 * interface AppState {
 *   connection: { connected: boolean; port: number };
 *   files: { watched: number; uploaded: number };
 * }
 * 
 * const store = new StateStore<AppState>({
 *   connection: { connected: false, port: 12525 },
 *   files: { watched: 0, uploaded: 0 },
 * });
 * 
 * // Subscribe to all changes
 * store.subscribe((state) => console.log('State changed:', state));
 * 
 * // Subscribe to specific value
 * store.select(s => s.connection.connected, (connected) => {
 *   console.log('Connection status:', connected);
 * });
 * 
 * // Update state
 * store.setState({ connection: { connected: true, port: 12525 } });
 * ```
 */

import { EventEmitter } from "./event-emitter.ts";

type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export class StateStore<T extends object> extends EventEmitter<{ change: T }> {
  private state: T;

  constructor(initialState: T) {
    super();
    this.state = initialState;
  }

  /**
   * Get the current state (read-only)
   */
  getState(): Readonly<T> {
    return this.state;
  }

  /**
   * Update state with partial updates (shallow merge)
   */
  setState(partial: Partial<T>): void {
    this.state = { ...this.state, ...partial };
    this.emit("change", this.state);
  }

  /**
   * Update state with deep partial updates
   */
  setDeepState(partial: DeepPartial<T>): void {
    this.state = this.deepMerge(this.state, partial);
    this.emit("change", this.state);
  }

  /**
   * Update a specific slice of state
   */
  update<K extends keyof T>(key: K, updater: (value: T[K]) => T[K]): void {
    this.state = {
      ...this.state,
      [key]: updater(this.state[key]),
    };
    this.emit("change", this.state);
  }

  /**
   * Subscribe to all state changes
   * @returns Unsubscribe function
   */
  subscribe(callback: (state: T) => void): () => void {
    return this.on("change", callback);
  }

  /**
   * Subscribe to changes in a specific value derived from state
   * Only triggers when the selected value actually changes
   * @returns Unsubscribe function
   */
  select<R>(
    selector: (state: T) => R,
    callback: (value: R) => void,
    compare: (a: R, b: R) => boolean = (a, b) => a === b
  ): () => void {
    let previous = selector(this.state);
    
    return this.on("change", (state) => {
      const current = selector(state);
      if (!compare(previous, current)) {
        callback(current);
        previous = current;
      }
    });
  }

  /**
   * Reset state to initial values
   */
  reset(initialState: T): void {
    this.state = initialState;
    this.emit("change", this.state);
  }

  /**
   * Deep merge utility
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private deepMerge(target: any, partial: any): any {
    const result = { ...target };
    
    for (const key in partial) {
      if (Object.prototype.hasOwnProperty.call(partial, key)) {
        const value = partial[key];
        if (
          value !== undefined &&
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value) &&
          typeof target[key] === "object" &&
          target[key] !== null
        ) {
          result[key] = this.deepMerge(target[key], value);
        } else if (value !== undefined) {
          result[key] = value;
        }
      }
    }
    
    return result;
  }
}
