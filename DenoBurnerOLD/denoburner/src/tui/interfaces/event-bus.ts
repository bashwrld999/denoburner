/**
 * TUI Event Bus Interface
 * 
 * Observer pattern for event distribution in the TUI.
 */

import type { LogEntry } from "../../logger/interfaces/index.ts";

/**
 * TUI Event types
 */
export type TuiEvent =
  | { type: "connection:changed"; connected: boolean; port: number }
  | { type: "file:uploaded"; filename: string; server: string; ram: number }
  | { type: "file:deleted"; filename: string; server: string }
  | { type: "log:added"; entry: LogEntry }
  | { type: "input:key"; key: string; code: number }
  | { type: "ui:resize"; width: number; height: number }
  | { type: "ui:render" }
  | { type: "stats:updated"; stats: TuiStats };

/**
 * TUI Stats
 */
export interface TuiStats {
  connected: boolean;
  port: number;
  filesUploaded: number;
  filesWatched: number;
  totalRam: number;
  lastUpload: {
    filename: string;
    server: string;
    ram: number;
    timestamp: Date;
  } | null;
  files: Array<{ filename: string; server: string; ram: number }>;
}

/**
 * Event subscriber callback
 */
export type EventSubscriber<T extends TuiEvent = TuiEvent> = (event: T) => void | Promise<void>;

/**
 * Event Bus Interface
 * 
 * Provides pub/sub event distribution for TUI components.
 */
export interface EventBus {
  /**
   * Emit an event to all subscribers
   */
  emit(event: TuiEvent): void;

  /**
   * Subscribe to events of a specific type
   * @returns Unsubscribe function
   */
  subscribe<T extends TuiEvent["type"]>(
    type: T,
    subscriber: EventSubscriber<Extract<TuiEvent, { type: T }>>
  ): () => void;

  /**
   * Subscribe to all events
   * @returns Unsubscribe function
   */
  subscribeAll(subscriber: EventSubscriber): () => void;

  /**
   * Clear all subscribers
   */
  clear(): void;
}
