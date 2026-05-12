/**
 * Typed Event Bus
 * 
 * Central event bus for decoupled communication between components.
 * Uses typed events for type safety.
 */

/**
 * Event map type - maps event names to their payload types
 * Uses index signature to satisfy Record<string, unknown> constraint
 */
export type EventMap = { [key: string]: unknown };

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

/**
 * Event Bus Interface
 */
export interface IEventBus<TEventMap extends EventMap> {
  /**
   * Emit an event
   */
  emit<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): void;

  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  on<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): () => void;

  /**
   * Subscribe to an event (one-time)
   * @returns Unsubscribe function
   */
  once<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): () => void;

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): void;

  /**
   * Clear all subscribers for an event (or all events)
   */
  clear(event?: keyof TEventMap): void;
}

/**
 * Typed Event Bus Implementation
 */
export class TypedEventBus<TEventMap extends EventMap> implements IEventBus<TEventMap> {
  private handlers = new Map<keyof TEventMap, Set<EventHandler<unknown>>>();

  emit<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error in event handler for "${String(event)}":`, error);
      }
    }
  }

  on<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);

    return () => this.off(event, handler);
  }

  once<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): () => void {
    const wrappedHandler: EventHandler<TEventMap[K]> = (payload) => {
      this.off(event, wrappedHandler);
      return handler(payload);
    };
    return this.on(event, wrappedHandler);
  }

  off<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler<unknown>);
    }
  }

  clear(event?: keyof TEventMap): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}

/**
 * Create a typed event bus
 */
export function createEventBus<TEventMap extends EventMap>(): IEventBus<TEventMap> {
  return new TypedEventBus<TEventMap>();
}
