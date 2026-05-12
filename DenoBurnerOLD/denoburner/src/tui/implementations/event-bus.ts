/**
 * Event Bus Implementation
 * 
 * Observer pattern for event distribution.
 */

import type { EventBus, TuiEvent, EventSubscriber } from "../interfaces/index.ts";

/**
 * TUI Event Bus
 * 
 * Provides pub/sub event distribution for TUI components.
 */
export class TuiEventBus implements EventBus {
  private subscribers: Map<string, Set<EventSubscriber>> = new Map();
  private allSubscribers: Set<EventSubscriber> = new Set();

  emit(event: TuiEvent): void {
    // Notify type-specific subscribers
    const typeSubscribers = this.subscribers.get(event.type);
    if (typeSubscribers) {
      for (const subscriber of typeSubscribers) {
        try {
          subscriber(event);
        } catch (error) {
          console.error(`Event subscriber error for ${event.type}:`, error);
        }
      }
    }

    // Notify all-event subscribers
    for (const subscriber of this.allSubscribers) {
      try {
        subscriber(event);
      } catch (error) {
        console.error("All-event subscriber error:", error);
      }
    }
  }

  subscribe<T extends TuiEvent["type"]>(
    type: T,
    subscriber: EventSubscriber<Extract<TuiEvent, { type: T }>>
  ): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(subscriber as EventSubscriber);

    return () => {
      const typeSubscribers = this.subscribers.get(type);
      if (typeSubscribers) {
        typeSubscribers.delete(subscriber as EventSubscriber);
      }
    };
  }

  subscribeAll(subscriber: EventSubscriber): () => void {
    this.allSubscribers.add(subscriber);
    return () => {
      this.allSubscribers.delete(subscriber);
    };
  }

  clear(): void {
    this.subscribers.clear();
    this.allSubscribers.clear();
  }
}

/**
 * Create a new event bus
 */
export function createEventBus(): EventBus {
  return new TuiEventBus();
}
