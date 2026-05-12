/**
 * EventEmitter - Type-safe event system
 * 
 * Provides a unified event handling mechanism across all components.
 * 
 * @example
 * ```ts
 * interface MyEvents {
 *   'file:changed': { path: string; content: string };
 *   'file:deleted': { path: string };
 * }
 * 
 * const emitter = new EventEmitter<MyEvents>();
 * const unsubscribe = emitter.on('file:changed', (data) => {
 *   console.log(`File changed: ${data.path}`);
 * });
 * 
 * emitter.emit('file:changed', { path: 'test.ts', content: '...' });
 * unsubscribe();
 * ```
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (event: any) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class EventEmitter<EventMap = any> {
  private handlers = new Map<keyof EventMap, Set<EventHandler>>();

  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  on<K extends keyof EventMap>(
    event: K,
    handler: (event: EventMap[K]) => void
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);
    
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event, automatically unsubscribe after first emit
   * @returns Unsubscribe function
   */
  once<K extends keyof EventMap>(
    event: K,
    handler: (event: EventMap[K]) => void
  ): () => void {
    const wrapper = (data: EventMap[K]) => {
      this.off(event, wrapper);
      handler(data);
    };
    return this.on(event, wrapper);
  }

  /**
   * Emit an event to all subscribers
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      // Create a copy to prevent modification during iteration
      [...handlers].forEach((h) => h(data));
    }
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof EventMap>(
    event: K,
    handler: (event: EventMap[K]) => void
  ): void {
    this.handlers.get(event)?.delete(handler as EventHandler);
  }

  /**
   * Remove all handlers for an event, or all handlers if no event specified
   */
  clear<K extends keyof EventMap>(event?: K): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Get the number of handlers for an event
   */
  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}
