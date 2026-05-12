/**
 * Event Processor Interface
 * 
 * Chain of Responsibility pattern for processing file watch events.
 */

import type { WatcherContext, ProcessorResult } from "../types.ts";

/**
 * Event Processor interface
 * 
 * Processors form a chain that transforms and filters file events.
 * Each processor can modify the context and decide whether to continue
 * processing or stop the chain.
 * 
 * @example
 * ```ts
 * class DebounceProcessor implements EventProcessor {
 *   name = "debounce";
 *   
 *   async process(ctx, next) {
 *     // Debounce logic...
 *     await next();
 *   }
 * }
 * ```
 */
export interface EventProcessor {
  /**
   * Processor name for debugging and logging
   */
  readonly name: string;
  
  /**
   * Process the watcher context
   * 
   * @param ctx The watcher context containing event and files
   * @param next Function to call the next processor in the chain
   * @returns Processor result indicating whether to continue
   */
  process(ctx: WatcherContext, next: () => Promise<void>): Promise<void>;
}

/**
 * Event Processor chain manager
 * 
 * Manages a chain of processors and executes them in order.
 */
export interface ProcessorChain {
  /**
   * Add a processor to the chain
   * @param processor The processor to add
   */
  add(processor: EventProcessor): void;
  
  /**
   * Remove a processor from the chain
   * @param name The name of the processor to remove
   */
  remove(name: string): void;
  
  /**
   * Get all processors in the chain
   */
  getProcessors(): EventProcessor[];
  
  /**
   * Execute the processor chain
   * @param ctx The context to process
   */
  execute(ctx: WatcherContext): Promise<void>;
  
  /**
   * Clear all processors from the chain
   */
  clear(): void;
}
