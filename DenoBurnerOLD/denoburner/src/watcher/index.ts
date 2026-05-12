/**
 * Watcher Module
 * 
 * Provides file watching with extensible architecture.
 * 
 * Features:
 * - Strategy pattern for different watching implementations
 * - Chain of Responsibility for event processing
 * - Repository pattern for file metadata
 * - Factory pattern for easy configuration
 * 
 * @example
 * ```ts
 * import { createWatcher } from "./watcher/index.ts";
 * 
 * const watcher = createWatcher({
 *   patterns: config.watch,
 *   debounceDelay: 50,
 * });
 * 
 * watcher.on("hmr", (data) => {
 *   console.log(`File changed: ${data.file}`);
 * });
 * 
 * await watcher.start();
 * ```
 */

// Re-export types
export type {
  FileWatchEvent,
  ProcessedFile,
  HmrData,
  WatcherContext,
  FileInfo,
  WatcherStats,
  WatcherOptions,
  ProcessorResult,
} from "./types.ts";

// Re-export FileEvent from core types
export type { FileEvent } from "../types.ts";

// Re-export interfaces
export type {
  FileWatcher,
  FileWatchCallback,
  EventProcessor,
  ProcessorChain,
  FileRepository,
} from "./interfaces/index.ts";

// Re-export strategies
export { DenoFsWatcher } from "./strategies/index.ts";

// Re-export processors
export {
  createProcessorChain,
  PatternFilterProcessor,
  DebounceProcessor,
  BatchProcessor,
} from "./processors/index.ts";
export type { BatchOptions } from "./processors/index.ts";

// Re-export repository
export { createFileRepository, FileRepositoryImpl } from "./repository/index.ts";

// Re-export watcher and factory
export { WatcherImpl } from "./watcher.ts";
export type { WatcherEventMap } from "./watcher.ts";
export { createWatcher } from "./factory.ts";

// Re-export location cache
export { LocationCache, createLocationCache } from "./location-cache.ts";
export type { ResolvedFileLocation, LocationCacheOptions } from "./location-cache.ts";

// Re-export dependency graph
export { DependencyGraph, createDependencyGraph } from "./dependency-graph.ts";
export type {
  DependencyNode,
  DependencyGraphOptions,
  DependencyAnalysisResult,
  CascadingUpdateResult,
} from "./dependency-graph.ts";

// Re-export HMR batcher
export { HmrBatcher, createHmrBatcher } from "./hmr-batcher.ts";
export type { BatchHmrEvent, HmrBatcherOptions, BatchHandler } from "./hmr-batcher.ts";

// Re-export enhanced location
export {
  LocationPresets,
  ExampleConfigs,
  parseFileContext,
  substituteTemplate,
  resolveEnhancedLocation,
  createLocationResolver,
} from "./enhanced-location.ts";
export type {
  LocationContext,
  LocationResult,
  SingleLocationConfig,
  LocationResolver,
  EnhancedLocationConfig,
} from "./enhanced-location.ts";

// Re-export change metadata
export { ChangeAnalyzer, createChangeAnalyzer, parseImports } from "./change-metadata.ts";
export type {
  ContentHash,
  ImportChanges,
  ChangeMetadata,
  ChangeAnalyzerOptions,
} from "./change-metadata.ts";

// Re-export specifications
export type { IFileSpecification, ICompositeSpecification, FileSpec } from "./specifications/index.ts";
export {
  PatternSpecification,
  ExtensionSpecification,
  DirectorySpecification,
  RegexSpecification,
  NotSpecification,
  AlwaysSpecification,
  pattern,
  extension,
  directory,
  regex,
  not,
  always,
  never,
  AndSpecification,
  OrSpecification,
  XorSpecification,
  SpecificationBuilder,
  and,
  or,
  xor,
  spec,
} from "./specifications/index.ts";
