/**
 * Watcher Orchestrator
 * 
 * Coordinates file watching strategies, event processors, and file repository.
 * Emits HMR events for file changes.
 */

import { EventEmitter } from "../core/event-emitter.ts";
import type { FileWatcher, ProcessorChain, FileRepository } from "./interfaces/index.ts";
import type {
  WatcherOptions,
  WatcherStats,
  WatcherContext,
  ProcessedFile,
  HmrData,
} from "./types.ts";
import type { ResolvedWatchItem } from "../config/types.ts";
import type { LogLevel } from "../logger/interfaces/index.ts";
import type { WatchItemSpecification } from "./specifications/index.ts";
import { watchItemSpec } from "./specifications/index.ts";

/**
 * Get base directory from a glob pattern
 */
function getBaseDir(pattern: string): string {
  return pattern.split(/[*?{]/)[0].replace(/\/+$/, "") || ".";
}

/**
 * Watcher event map
 */
export interface WatcherEventMap {
  "hmr": HmrData;
  "log": { text: string; type: LogLevel; name: string };
  "error": { error: Error; context?: string };
}

/**
 * Watcher Orchestrator
 * 
 * Coordinates file watching strategies, event processors, and file repository.
 * Emits HMR events for file changes.
 * 
 * @example
 * ```ts
 * const watcher = new WatcherImpl(strategy, processorChain, repository, options);
 * watcher.on("hmr", (data) => console.log(data));
 * await watcher.start();
 * ```
 */
export class WatcherImpl extends EventEmitter<WatcherEventMap> {
  private strategy: FileWatcher;
  private processorChain: ProcessorChain;
  private repository: FileRepository;
  private options: WatcherOptions;
  private stats: WatcherStats;
  private running = false;
  private specifications: WatchItemSpecification[];
  
  constructor(
    strategy: FileWatcher,
    processorChain: ProcessorChain,
    repository: FileRepository,
    options: WatcherOptions,
  ) {
    super();
    this.strategy = strategy;
    this.processorChain = processorChain;
    this.repository = repository;
    this.options = options;
    // Pre-build specifications for each watch item
    this.specifications = options.patterns.map(item => watchItemSpec(item));
    this.stats = {
      filesWatched: 0,
      eventsProcessed: 0,
      filesUploaded: 0,
    };
  }
  
  /**
   * Start watching for file changes
   */
  async start(): Promise<void> {
    if (this.running) return;
    
    this.running = true;
    this.stats.startedAt = new Date();
    
    // Initial file scan (before starting watcher)
    await this.scanFiles();
    
    this.emit("log", {
      text: `Watching ${this.stats.filesWatched} files`,
      type: "info",
      name: "Watcher",
    });
    
    // Set up event handler
    this.strategy.onEvent((event) => this.handleEvent(event));
    
    // Start the strategy (non-blocking - it runs forever)
    this.strategy.start();
  }
  
  /**
   * Stop watching for file changes
   */
  stop(): void {
    if (!this.running) return;
    
    this.running = false;
    this.strategy.stop();
  }
  
  /**
   * Check if the watcher is running
   */
  isRunning(): boolean{
    return this.running;
  }
  
  /**
   * Get watcher statistics
   */
  getStats(): WatcherStats{
    return { ...this.stats };
  }
  
  /**
   * Get all watched files
   */
  async getAllFiles(): Promise<string[]>{
    const files = await this.repository.getAll();
    return files.map((f) => f.path);
  }
  
  /**
   * Find the watch item that matches a file
   */
  findItem(file: string): ResolvedWatchItem | undefined{
    const spec = this.specifications.find((s) => s.isSatisfiedBy(file));
    return spec?.watchItem;
  }
  
  /**
   * Get specifications (for external use/testing)
   */
  getSpecifications(): WatchItemSpecification[] {
    return [...this.specifications];
  }
  
  /**
   * Handle a file system event
   */
  private async handleEvent(event: { kind: string; paths: string[]; timestamp: number }): Promise<void>{
    if (!this.running) return;
    
    this.stats.eventsProcessed++;
    this.stats.lastEvent = new Date();
    
    // Create context
    const ctx: WatcherContext = {
      event: event as WatcherContext["event"],
      files: [],
      metadata: new Map(),
      startedAt: Date.now(),
    };
    
    try {
      // Run through processor chain
      await this.processorChain.execute(ctx);
      
      // Emit HMR events for processed files
      for (const file of ctx.files) {
        await this.emitHmrEvent(file);
      }
      
      // Update stats
      await this.scanFiles();
    } catch (error) {
      this.emit("error", {
        error: error instanceof Error ? error : new Error(String(error)),
        context: "event handling",
      });
    }
  }
  
  /**
   * Emit an HMR event for a processed file
   */
  private async emitHmrEvent(file: ProcessedFile): Promise<void>{
    const hmrData: HmrData = {
      file: file.path,
      event: file.event,
      timestamp: Date.now(),
      pattern: file.watchItem.pattern,
      transform: file.watchItem.transform,
      bundle: file.watchItem.bundle,
      transpile: file.watchItem.transpile,
      location: file.watchItem.location,
      cascadeOnly: file.watchItem.cascadeOnly,
    };
    
    this.emit("hmr", hmrData);
  }
  
  /**
   * Scan all files matching watch patterns
   */
  private async scanFiles(): Promise<void>{
    const files = new Set<string>();
    
    for (const spec of this.specifications) {
      const baseDir = getBaseDir(spec.watchItem.pattern);
      
      try {
        for await (const entry of this.walkDir(baseDir)) {
          if (spec.isSatisfiedBy(entry)) {
            files.add(entry);
            
            // Update repository
            await this.repository.refresh(entry);
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }
    
    this.stats.filesWatched = files.size;
  }
  
  /**
   * Walk a directory recursively
   */
  private async *walkDir(dir: string): AsyncGenerator<string>{
    const cwd = Deno.cwd();
    
    try {
      for await (const entry of Deno.readDir(dir)) {
        const path = `${dir}/${entry.name}`;
        
        if (entry.isDirectory) {
          yield* this.walkDir(path);
        } else if (entry.isFile) {
          // Return relative path
          const relative = path.replace(cwd + "/", "").replace(cwd, "");
          yield relative.replaceAll("\\", "/");
        }
      }
    } catch {
      // Ignore errors
    }
  }
}
