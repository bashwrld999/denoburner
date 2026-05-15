// ── RPC Internals ───────────────────────────────────────
export { RpcDispatcher } from "./rpc/dispatcher.ts";
export { RpcClient } from "./rpc/client.ts";
export { PendingRequestMap } from "./rpc/pending_requests.ts";
export { RpcCommandExecutor } from "./rpc/command.ts";
export { PushFileCommand } from "./rpc/commands/push_file_command.ts";
export { DeleteFileCommand } from "./rpc/commands/delete_file_command.ts";
export { CalculateRamCommand } from "./rpc/commands/calculate_ram_command.ts";
export type { RpcCommand } from "./rpc/command.ts";

// ── Server Internals ────────────────────────────────────
export { WebSocketServer } from "./server/websocket_server.ts";
export { WsClient } from "./server/ws_client.ts";
export type { IClientConnection, IServer, IWsClient } from "./server/interfaces.ts";

// ── Pipeline Internals ──────────────────────────────────
export { UploadPipeline } from "./pipeline/pipeline.ts";
export { GlobFilterStage } from "./pipeline/stages/glob_filter.ts";
export { ReadFileStage } from "./pipeline/stages/read_file.ts";
export { BundleStage } from "./pipeline/stages/bundle.ts";
export { PathMapStage } from "./pipeline/stages/path_map.ts";
export { RamCheckStage } from "./pipeline/stages/ram_check.ts";
export { UploadStage } from "./pipeline/stages/upload.ts";
export { WriteDistStage } from "./pipeline/stages/write_dist.ts";
export { NotifyStage } from "./pipeline/stages/notify.ts";
export { DryRunUploadStage } from "./pipeline/stages/dry_run_upload.ts";
export { StageDecorator } from "./pipeline/decorators/stage_decorator.ts";
export { TimingStageDecorator } from "./pipeline/decorators/timing_decorator.ts";
export { RetryStageDecorator } from "./pipeline/decorators/retry_decorator.ts";

// ── TUI Internals ───────────────────────────────────────
export { TuiEventBus } from "./tui/event_bus.ts";
export { AnsiRenderer } from "./tui/ansi_renderer.ts";
export { SilentRenderer } from "./tui/silent_renderer.ts";

// ── Bundler Internals ───────────────────────────────────
export { EsbuildBundler } from "./bundler/esbuild_bundler.ts";
export { IdentityBundler } from "./bundler/identity_bundler.ts";
export { PluginManager } from "./bundler/plugin-manager.ts";
export { ExternalStrategy } from "./bundler/strategies/external-strategy.ts";
export { reactPlugin } from "./bundler/plugins/react.ts";
export { cssPlugin } from "./bundler/plugins/css.ts";
export { textPlugin } from "./bundler/plugins/text.ts";
export type { BundlerPlugin, BundlerPluginHooks } from "./bundler/plugin-manager.ts";

// ── State Internals ─────────────────────────────────────
export { FileCache, createFileCache } from "./state/cache.ts";
export { UploadQueueManager } from "./state/queue.ts";

// ── Watcher Internals ───────────────────────────────────
export { DenoFileWatcher } from "./watcher/deno_file_watcher.ts";
export { DependencyGraph } from "./watcher/dependency-graph.ts";
export { HmrBatcher } from "./watcher/hmr_batcher.ts";

// ── CLI Manager Internals ───────────────────────────────
export { DevServer } from "./cli/dev_server.ts";
export { ConnectionManager } from "./cli/connection_manager.ts";
export { ChangeProcessor } from "./cli/change_processor.ts";
export { PipelineOrchestrator } from "./cli/pipeline_orchestrator.ts";
export { ShutdownManager } from "./cli/shutdown_manager.ts";
export { KeypressHandler } from "./cli/keypress_handler.ts";
export { SyncOrchestrator } from "./cli/sync_orchestrator.ts";
export { RenameDetector } from "./cli/rename_detector.ts";

// ── Plugin Internals ────────────────────────────────────
export { loadPlugins } from "./plugin/loader.ts";

// ── Error Types ─────────────────────────────────────────
export { DenoburnerError, ConfigError, NetworkError, RpcError, PipelineError, WatcherError, toDenoburnerError, ErrorCodes } from "./core/errors.ts";
