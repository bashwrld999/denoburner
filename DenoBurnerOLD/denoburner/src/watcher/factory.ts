/**
 * Watcher Factory
 * 
 * Creates configured watcher instances.
 */

import type { FileWatcher, ProcessorChain, FileRepository } from "./interfaces/index.ts";
import type { WatcherOptions } from "./types.ts";
import { WatcherImpl } from "./watcher.ts";
import { DenoFsWatcher } from "./strategies/index.ts";
import { createProcessorChain, PatternFilterProcessor, DebounceProcessor, BatchProcessor } from "./processors/index.ts";
import { createFileRepository } from "./repository/index.ts";
import type { ResolvedWatchItem } from "../config/types.ts";

/**
 * Get base directory from a glob pattern
 */
function getBaseDir(pattern: string): string {
  return pattern.split(/[*?{]/)[0].replace(/\/+$/, "") || ".";
}

/**
 * Create a file watcher strategy
 */
function createWatcherStrategy(
  baseDir: string
): FileWatcher {
  return new DenoFsWatcher(baseDir);
}

/**
 * Create a processor chain with default processors
 */
function createDefaultProcessorChain(
  patterns: ResolvedWatchItem[],
  options: WatcherOptions,
): ProcessorChain {
  const chain = createProcessorChain();
  
  // Add debounce processor FIRST (before pattern filter)
  // This ensures we debounce raw file events before processing
  if (options.debounceDelay !== undefined && options.debounceDelay > 0) {
    chain.add(new DebounceProcessor(options.debounceDelay));
  }
  
  // Add pattern filter
  chain.add(new PatternFilterProcessor(patterns));
  
  // Add batch processor
  if (options.batchEnabled !== false) {
    chain.add(new BatchProcessor({
      maxSize: options.batchMaxSize,
      timeout: options.batchTimeout,
    }));
  }
  
  return chain;
}

/**
 * Create a watcher with all dependencies configured
 */
export function createWatcher(options: WatcherOptions): WatcherImpl {
  // Get base directories from patterns
  const baseDirs = [...new Set(options.patterns.map((p) => getBaseDir(p.pattern)))];
  
  // Deduplicate directories (remove subdirectories if parent is already watched)
  const dedupedDirs = baseDirs.filter(
    (dir) =>
      !baseDirs.some((other) => other !== dir && dir.startsWith(other + "/")),
  );
  
  // Use the first deduplicated directory as the base
  const baseDir = dedupedDirs[0] ?? Deno.cwd();
  
  // Create strategy
  const strategy = createWatcherStrategy(baseDir);
  
  // Create processor chain
  const processorChain = createDefaultProcessorChain(options.patterns, options);
  
  // Create repository
  const repository = createFileRepository();
  
  return new WatcherImpl(strategy, processorChain, repository, options);
}
