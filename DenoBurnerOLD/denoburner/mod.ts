/**
 * Denoburner
 * 
 * Bitburner development tool for Deno.
 */

// Core infrastructure
export { EventEmitter } from "./src/core/event-emitter.ts";
export type { Ok, Err } from "./src/core/result.ts";
export { Result } from "./src/core/result.ts";
export type { Result as ResultType } from "./src/core/result.ts";
export { StateStore } from "./src/core/state-store.ts";
export { ServiceContainer, ServiceToken } from "./src/core/service-container.ts";

// Config
export { defineConfig, loadConfig, resolveConfig } from "./src/config/index.ts";
export type {
  DenoBurnerConfig,
  DenoBurnerUserConfig,
  ResolvedDenoBurnerConfig,
  WatchItem,
  ResolvedWatchItem,
  ThemeConfig,
  DownloadConfig,
} from "./src/config/types.ts";

// Remote API
export { RemoteApiServer } from "./src/remote-api/index.ts";
export type {
  RemoteApiOptions,
  ConnectionState,
} from "./src/remote-api/index.ts";

// Analyzer
export { DependencyAnalyzer } from "./src/analyzer/index.ts";
export type {
  DependencyInfo,
  LocalImport,
  ExternalImport,
} from "./src/analyzer/index.ts";

// Bundler
export { Bundler, createBundler, createBundlerWithPlugins, createBundlerWithStrategy, createCustomBundler } from "./src/bundler/index.ts";
export { PluginManager } from "./src/bundler/plugin-manager.ts";
export type {
  BundleMode,
  BundlerOptions,
  BundledFile,
  ProcessedFile,
} from "./src/bundler/index.ts";
export type { BundlerPlugin, BundlerPluginHooks } from "./src/bundler/plugin-manager.ts";

// Uploader
export { UploaderOrchestrator as FileUploader, createUploader, createCustomUploader } from "./src/uploader/index.ts";
export type { UploaderStats, FileProcessor, UploadStrategy, StatsRepository, PipelineStage, Pipeline } from "./src/uploader/index.ts";

// TUI
export { TuiFacade, createTui } from "./src/tui/index.ts";
export type {
  TuiStats,
  TuiState,
  EventBus,
  Renderer,
  InputHandler,
} from "./src/tui/index.ts";

// Watcher
export { WatcherImpl as Watcher, createWatcher } from "./src/watcher/index.ts";
export type { WatcherEventMap } from "./src/watcher/index.ts";

// State
export { 
  DenoburnerStateStore, 
  createStateStore, 
  FileCache, 
  createFileCache,
  UploadQueueManager,
  createUploadQueue,
  selectors,
} from "./src/state/index.ts";
export type {
  DenoburnerState,
  ConnectionState as StateConnectionState,
  FilesState,
  TrackedFile,
  QueuedUpload,
  QueueState,
  UiState,
  StateAction,
  RetryConfig,
} from "./src/state/index.ts";

// Factory
export { createDevServer, Tokens, type AppState } from "./src/factories/index.ts";

// Core types
export type { HmrData, UploadResult, FileInfo, FileEvent } from "./src/types.ts";
