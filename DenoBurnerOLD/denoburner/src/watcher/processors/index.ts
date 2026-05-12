/**
 * Processor Chain Manager
 * 
 * Manages and executes a chain of event processors.
 */

import type { EventProcessor, ProcessorChain } from "../interfaces/index.ts";
import type { WatcherContext } from "../types.ts";

/**
 * Processor Chain implementation
 */
export class ProcessorChainImpl implements ProcessorChain {
  private processors: EventProcessor[] = [];
  
  add(processor: EventProcessor): void {
    this.processors.push(processor);
  }
  
  remove(name: string): void {
    this.processors = this.processors.filter((p) => p.name !== name);
  }
  
  getProcessors(): EventProcessor[] {
    return [...this.processors];
  }
  
  async execute(ctx: WatcherContext): Promise<void> {
    // Build the chain from right to left
    // Each processor calls next() to continue the chain
    let index = 0;
    
    const runNext = async (): Promise<void> => {
      if (index >= this.processors.length) {
        return;
      }
      
      const processor = this.processors[index];
      index++;
      
      await processor.process(ctx, runNext);
    };
    
    await runNext();
  }
  
  clear(): void {
    this.processors = [];
  }
}

/**
 * Create a new processor chain
 */
export function createProcessorChain(): ProcessorChain {
  return new ProcessorChainImpl();
}

// Re-export individual processors
export { PatternFilterProcessor } from "./pattern-filter.ts";
export { DebounceProcessor } from "./debounce-processor.ts";
export { BatchProcessor } from "./batch-processor.ts";
export type { BatchOptions } from "./batch-processor.ts";
