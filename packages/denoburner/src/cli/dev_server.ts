import { relative } from "@std/path";
import { Logger } from "../logger/logger.ts";
import { TuiTransport } from "../logger/tui_transport.ts";
import { DenoFileWatcher } from "../watcher/deno_file_watcher.ts";
import { DependencyGraph } from "../watcher/dependency-graph.ts";
import { createUploadPipeline } from "../pipeline/factory.ts";
import { getSourceDirs } from "../pipeline/source-mapper.ts";
import { TuiEventBridge } from "./tui_event_bridge.ts";
import { SyncOrchestrator } from "./sync_orchestrator.ts";
import { DryRunUploadStage } from "../pipeline/stages/dry_run_upload.ts";
import { GlobFilterStage } from "../pipeline/stages/glob_filter.ts";
import { ReadFileStage } from "../pipeline/stages/read_file.ts";
import { BundleStage } from "../pipeline/stages/bundle.ts";
import { NotifyStage } from "../pipeline/stages/notify.ts";
import { UploadPipeline } from "../pipeline/pipeline.ts";
import { TimingStageDecorator } from "../pipeline/decorators/timing_decorator.ts";
import { ConnectionManager } from "./connection_manager.ts";
import { ChangeProcessor } from "./change_processor.ts";
import { PipelineOrchestrator } from "./pipeline_orchestrator.ts";
import { ShutdownManager } from "./shutdown_manager.ts";
import { KeypressHandler } from "./keypress_handler.ts";
import { loadPlugins } from "../plugin/loader.ts";
import type { DenoburnerConfig } from "../config/types.ts";
import { DEFAULT_CONFIG } from "../config/types.ts";
import type { ILogger } from "../logger/interfaces.ts";
import type { ITuiRenderer } from "../tui/interfaces.ts";
import type { IBundler } from "../bundler/interface.ts";
import type { IPipeline, PipelineContext } from "../pipeline/types.ts";
import type { DevEnvironment } from "../environment.ts";
import type { DenoburnerPlugin } from "../plugin/types.ts";

export class DevServer {
  private renderer: ITuiRenderer;
  private systemLog: ILogger;
  private env: DevEnvironment;
  private watcher: DenoFileWatcher;
  private depGraph: DependencyGraph;
  private config: DenoburnerConfig;
  private cwd: string;
  private verbose: boolean;
  private fetchTypes: boolean;
  private dryRun: boolean;
  private configPath?: string;

  private uploadLog!: ILogger;
  private connectLog!: ILogger;
  private syncLog!: ILogger;
  private watchLog!: ILogger;
  private serverLog!: ILogger;
  private queueLog!: ILogger;
  private pipeline!: IPipeline;
  private sync!: SyncOrchestrator;

  private sources = DEFAULT_CONFIG.sources!;
  private defaultServer = "home";

  private connectionManager!: ConnectionManager;
  private changeProcessor!: ChangeProcessor;
  private pipelineOrch!: PipelineOrchestrator;
  private shutdownManager!: ShutdownManager;
  private keypressHandler!: KeypressHandler;
  private plugins: DenoburnerPlugin[] = [];
  private bundler!: IBundler;

  constructor(
    config: DenoburnerConfig,
    renderer: ITuiRenderer,
    systemLog: ILogger,
    env: DevEnvironment,
    bundler: IBundler,
    depGraph: DependencyGraph,
    watcher: DenoFileWatcher,
    cwd: string,
    verbose: boolean,
    fetchTypes: boolean,
    dryRun: boolean = false,
    configPath?: string,
    private exitOnComplete: boolean = true,
  ) {
    this.config = config;
    this.renderer = renderer;
    this.systemLog = systemLog;
    this.env = env;
    this.bundler = bundler;
    this.depGraph = depGraph;
    this.watcher = watcher;
    this.cwd = cwd;
    this.verbose = verbose;
    this.fetchTypes = fetchTypes;
    this.dryRun = dryRun;
    this.configPath = configPath;
    this.sources = config.sources ?? DEFAULT_CONFIG.sources!;
    this.defaultServer = config.defaultServer ?? "home";

    this.connectionManager = new ConnectionManager(env, systemLog);
    this.pipelineOrch = new PipelineOrchestrator(config, bundler, env, systemLog, cwd, this.plugins);
    this.shutdownManager = new ShutdownManager(systemLog, this.exitOnComplete);
    this.keypressHandler = new KeypressHandler(renderer, {
      onQuit: () => this.stop(),
    });
  }

  async start(): Promise<void> {
    this.createLoggers();

    try {
      if (this.dryRun) {
        this.createDryRunPipeline();
      } else {
        this.pipeline = this.pipelineOrch.uploadPipeline;
      }

      this.sync = new SyncOrchestrator(this.config, this.depGraph, this.pipeline, this.syncLog, this.uploadLog, this.cwd);

      if (this.config.plugins && this.config.plugins.length > 0) {
        const configDir = this.configPath ? this.configPath.substring(0, this.configPath.lastIndexOf("/")) : this.cwd;
        const loaded = await loadPlugins(this.config.plugins, configDir, this.systemLog);
        this.plugins.push(...loaded);
      }

      this.setupTuiEventHandler();
      this.renderer.start();
      this.setupShutdownManager();
      this.setupKeypressHandler();

      await this.connectionManager.start();

      await this.sync.scanFiles();
      this.renderer.stats.watchedCount = this.sync.files.length;
      this.renderer.stats.cascadeDepth = this.config.hmr?.maxCascadeDepth ?? 10;
      this.syncLog.info(`Found ${this.sync.files.length} file(s)`);
      this.renderer.requestRender();
      this.sync.prePopulateGraph();
      this.renderer.stats.depGraphSize = this.depGraph.getAllFiles().length;

      this.serverLog.info("Waiting for Bitburner to connect...");
      await this.connectionManager.waitForConnection();

      this.setupChangeProcessor();
      const matched = await this.sync.runInitialSync();
      if (!this.config.skipInitialSync) {
        this.renderer.stats.watchedCount = matched;
      }
      this.setupWatcher();
    } catch (err) {
      this.systemLog.error(`Failed to start: ${err instanceof Error ? err.message : String(err)}`);
      await this.stop();
    }
  }

  private setupChangeProcessor(): void {
    this.changeProcessor = new ChangeProcessor(
      this.config, this.pipeline, this.env.cache,
      this.depGraph, this.env.commandExecutor, this.cwd,
      this.watchLog, this.uploadLog,
      () => { this.renderer.stats.depGraphSize = this.depGraph.getAllFiles().length; },
    );
  }

  private setupShutdownManager(): void {
    this.shutdownManager.add({ name: "batcher", stop: () => this.changeProcessor?.flush() });
    this.shutdownManager.add({ name: "uploadQueue", stop: async () => { await this.env.uploadQueue.drain(2000); } });
    this.shutdownManager.add({ name: "renderer", stop: () => this.renderer.stop() });
    this.shutdownManager.add({ name: "changeProcessor", stop: () => this.changeProcessor?.stop() });
    this.shutdownManager.add({ name: "watcher", stop: () => this.watcher.close() });
    this.shutdownManager.add({ name: "server", stop: () => this.connectionManager.stop() });
    this.shutdownManager.add({ name: "uploadQueueStop", stop: () => this.env.uploadQueue.stop() });
    this.shutdownManager.add({
      name: "bundler",
      stop: () => this.pipelineOrch.closeBundler(),
    });
    this.shutdownManager.setupSignalHandlers();
  }

  private createDryRunPipeline(): void {
    const decorate = (stage: import("../pipeline/types.ts").PipelineStage): import("../pipeline/types.ts").PipelineStage =>
      new TimingStageDecorator(stage, this.systemLog);

    this.pipeline = new UploadPipeline()
      .use(decorate(new GlobFilterStage(this.sources, this.cwd, this.defaultServer)))
      .use(decorate(new ReadFileStage()))
      .use(decorate(new BundleStage(this.bundler, this.sources, this.cwd)))
      .use(decorate(new DryRunUploadStage(this.uploadLog)))
      .use(new NotifyStage(this.env.eventBus));
  }

  private createLoggers(): void {
    const tuiLog = new Logger({ defaultCategory: "Upload" });
    tuiLog.addTransport(new TuiTransport((e) => this.renderer.appendLog(e)));
    this.uploadLog = tuiLog.child({ category: "Upload" });
    this.connectLog = tuiLog.child({ category: "Connect" });
    this.syncLog = tuiLog.child({ category: "Sync" });
    this.watchLog = tuiLog.child({ category: "Watcher" });
    this.serverLog = tuiLog.child({ category: "Server" });
    this.queueLog = tuiLog.child({ category: "Queue" });
  }

  private setupTuiEventHandler(): void {
    const bridge = new TuiEventBridge(
      this.renderer, this.env, this.uploadLog, this.connectLog, this.cwd,
      this.fetchTypes,
    );
    bridge.setup(this.env.eventBus);
  }

  private setupKeypressHandler(): void {
    this.keypressHandler.start();
  }

  async stop(): Promise<void> {
    this.env.pendingRequests.rejectAll(new Error("Shutting down"));
    this.changeProcessor?.flush();
    await this.shutdownManager.shutdown();
  }

  private setupWatcher(): void {
    this.setupConfigWatcher();

    const { config, cwd, watchLog, verbose } = this;

    this.watcher.onChange(async (event) => {
      const relPath = relative(cwd, event.path);
      if (verbose) watchLog.info(`[${event.type}] ${relPath}`);

      if (event.type === "remove") {
        this.changeProcessor?.onFileRemove(event.path);
        return;
      }

      this.changeProcessor?.batcherRef.add(event.path);
    });

    const watchRoots = getSourceDirs(this.sources, cwd);
    this.watcher.watch(watchRoots, {
      exts: [".ts", ".js", ".jsx", ".tsx", ".txt", ".script", ".json", ".md"],
      skip: [/\.d\.ts$/, /denoburner\.config\.(ts|js)$/],
      gitignore: true,
    });

    this.watchLog.info(`Watching ${this.renderer.stats.watchedCount} file${this.renderer.stats.watchedCount === 1 ? "" : "s"}`);
  }

  private setupConfigWatcher(): void {
    const configPath = this.configPath ?? findConfigFile(this.cwd);
    if (!configPath) return;

    const cw = new DenoFileWatcher(500);
    cw.watch([configPath], { exts: [".ts", ".js"] });
    cw.onChange(() => {
      this.watchLog.info("Config file changed — restart denoburner to apply changes");
    });
  }
}

function findConfigFile(cwd: string): string | null {
  const candidates = [
    `${cwd}/denoburner.config.ts`,
    `${cwd}/denoburner.config.js`,
    `${cwd}/denoburner/config.ts`,
  ];
  for (const p of candidates) {
    try {
      Deno.statSync(p);
      return p;
    } catch {
      // not found
    }
  }
  return null;
}
