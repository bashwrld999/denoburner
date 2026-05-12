import { keypress } from "@cliffy/keypress";
import { relative } from "@std/path";
import { Logger } from "../logger/logger.ts";
import { TuiTransport } from "../logger/tui_transport.ts";
import { DenoFileWatcher } from "../watcher/deno_file_watcher.ts";
import { DependencyGraph } from "../watcher/dependency-graph.ts";
import { HmrBatcher } from "../watcher/hmr_batcher.ts";
import { createUploadPipeline } from "../pipeline/factory.ts";
import { getWatchRoots } from "../pipeline/servers.ts";
import { TuiEventBridge } from "./tui_event_bridge.ts";
import { RenameDetector } from "./rename_detector.ts";
import { SyncOrchestrator, parseImports, resolveImportPath } from "./sync_orchestrator.ts";
import { DryRunUploadStage } from "../pipeline/stages/dry_run_upload.ts";
import { GlobFilterStage } from "../pipeline/stages/glob_filter.ts";
import { ReadFileStage } from "../pipeline/stages/read_file.ts";
import { BundleStage } from "../pipeline/stages/bundle.ts";
import { PathMapStage } from "../pipeline/stages/path_map.ts";
import { NotifyStage } from "../pipeline/stages/notify.ts";
import { UploadPipeline } from "../pipeline/pipeline.ts";
import { TimingStageDecorator } from "../pipeline/decorators/timing_decorator.ts";
import { RetryStageDecorator } from "../pipeline/decorators/retry_decorator.ts";
import type { DenoburnerConfig } from "../config/types.ts";
import type { ILogger } from "../logger/interfaces.ts";
import type { ITuiRenderer } from "../tui/interfaces.ts";
import type { IBundler } from "../bundler/interface.ts";
import type { IPipeline, PipelineContext } from "../pipeline/types.ts";
import type { DevEnvironment } from "../environment.ts";

export class DevServer {
  private renderer: ITuiRenderer;
  private systemLog: ILogger;
  private env: DevEnvironment;
  private depGraph: DependencyGraph;
  private watcher: DenoFileWatcher;
  private bundler: IBundler;
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
  private batcher!: HmrBatcher;
  private sync!: SyncOrchestrator;
  private renameDetector!: RenameDetector;

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
  }

  async start(): Promise<void> {
    this.createLoggers();
    if (this.dryRun) {
      this.createDryRunPipeline();
    } else {
      this.pipeline = createUploadPipeline(
        this.config, this.bundler, this.env.commandExecutor,
        this.env.eventBus, this.systemLog, this.env.cache,
        this.env.uploadQueue, this.uploadLog,
      );
    }

    this.sync = new SyncOrchestrator(this.config, this.depGraph, this.pipeline, this.syncLog, this.uploadLog, this.cwd);

    this.setupSignalHandlers();
    this.setupTuiEventHandler();
    this.renderer.start();
    this.setupKeyHandler();

    await this.startServer();

    // Scan + prep dep graph while waiting for Bitburner connection
    await this.sync.scanFiles();
    this.renderer.stats.watchedCount = this.sync.files.length;
    this.renderer.stats.cascadeDepth = this.config.hmr?.maxCascadeDepth ?? 10;
    this.syncLog.info(`Found ${this.sync.files.length} file(s)`);
    this.renderer.requestRender();
    this.sync.prePopulateGraph();
    this.renderer.stats.depGraphSize = this.depGraph.getAllFiles().length;

    this.serverLog.info("Waiting for Bitburner to connect...");
    await this.waitForConnection();

    const matched = await this.sync.runInitialSync();
    if (!this.config.ignoreInitial) {
      this.renderer.stats.watchedCount = matched;
    }
    this.setupWatcher();
  }

  private createDryRunPipeline(): void {
    const decorate = (stage: import("../pipeline/types.ts").PipelineStage): import("../pipeline/types.ts").PipelineStage =>
      new TimingStageDecorator(new RetryStageDecorator(stage, 2, 200, this.systemLog), this.systemLog);

    this.pipeline = new UploadPipeline()
      .use(decorate(new GlobFilterStage(this.config)))
      .use(decorate(new ReadFileStage()))
      .use(decorate(new BundleStage(this.bundler)))
      .use(decorate(new PathMapStage(this.config)))
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

  private setupSignalHandlers(): void {
    let forceExit = false;
    try {
      Deno.addSignalListener("SIGINT", async () => {
        if (forceExit) Deno.exit(1);
        forceExit = true;
        await this.stop();
      });
      Deno.addSignalListener("SIGTERM", async () => {
        if (forceExit) Deno.exit(1);
        forceExit = true;
        await this.stop();
      });
    } catch { /* signals not available */ }
  }

  private setupKeyHandler(): void {
    if (!Deno.stdin.isTerminal() || ("__test" in globalThis)) return;
    (async () => {
      for await (const key of keypress()) {
        if (key.key === "q") await this.stop();
        else if (key.key === "c") { this.renderer.clearLogs(); this.renderer.requestRender(); }
        else if (key.key === "e") { this.renderer.cycleExpand(); this.renderer.requestRender(); }
        else if (key.key === "l") { this.renderer.cycleFilter(); this.renderer.requestRender(); }
        else if (key.key === "?") { this.renderer.cycleHelp(); this.renderer.requestRender(); }
      }
    })();
  }

  private setupTuiEventHandler(): void {
    const bridge = new TuiEventBridge(this.renderer, this.env, this.uploadLog, this.connectLog, this.cwd, this.fetchTypes);
    bridge.setup(this.env.eventBus);
  }

  async stop(): Promise<void> {
    this.batcher?.flush();
    this.env.pendingRequests.rejectAll(new Error("Shutting down"));
    await this.env.uploadQueue.drain(2000);
    this.renderer.stop();
    this.batcher?.stop();
    this.watcher.close();
    await this.env.server.stop();
    this.env.uploadQueue.stop();
    if ("close" in this.bundler && typeof this.bundler.close === "function") {
      await this.bundler.close();
    }
    if (!("__test" in globalThis)) {
      Deno.exit(0);
    }
  }

  private async startServer(): Promise<void> {
    try {
      await this.env.server.start();
    } catch (err) {
      const msg = String(err);
      if (msg.includes("EADDRINUSE") || msg.includes("Address already in use") || msg.includes("address in use") || msg.includes("os error 98")) {
        this.serverLog.error(`Port ${this.config.port} is already in use. Try: denoburner dev --port ${this.config.port + 1}`);
      } else {
        this.serverLog.error(`Failed to start server: ${err}`);
      }
      await this.stop();
    }
    this.serverLog.info(`WebSocket server listening on port ${this.config.port}`);
  }

  private async waitForConnection(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.env.eventBus.on((event) => {
        if (event.type === "client_connected") resolve();
      });
    });
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

  private setupWatcher(): void {
    this.setupConfigWatcher();
    const { config, cwd, depGraph, env, watchLog, uploadLog, verbose } = this;

    this.renameDetector = new RenameDetector(
      config, cwd, depGraph,
      (path: string) => this.batcher.add(path),
    );

    this.batcher = new HmrBatcher(config.hmr?.batchDelay ?? 100, async (batch) => {
      const isRename = this.renameDetector.hasPending();

      for (const changedFile of batch) {
        if (isRename) {
          env.cache.remove(changedFile, config.defaultServer);
        }

        let deps: string[] = [];
        try {
          const content = Deno.readTextFileSync(changedFile);
          deps = parseImports(content)
            .map((imp) => resolveImportPath(changedFile, imp))
            .filter((p): p is string => p !== null);
        } catch (err) {
          watchLog.warn(`Failed to analyze ${changedFile}: ${err}`);
        }
        depGraph.update(changedFile, deps);
      }

      const allAffected = new Set<string>();
      for (const changedFile of batch) {
        for (const f of depGraph.getAffectedFiles(changedFile).affectedFiles) allAffected.add(f);
      }

      if (verbose && allAffected.size > batch.length) {
        watchLog.info(`${batch.length} file(s) changed, triggering ${allAffected.size - batch.length} dependent(s)`);
      }

      for (const filePath of allAffected) {
        const ctx: PipelineContext = {
          localPath: filePath,
          gameServer: config.defaultServer,
          gameFilename: relative(cwd, filePath),
          startedAt: Date.now(),
        };
        await this.pipeline.run(ctx);
        if (ctx.error) uploadLog.error(`Failed to upload ${ctx.gameFilename}: ${ctx.error.message}`);
      }

      await this.renameDetector.flushDeletes(env.commandExecutor, uploadLog);
      this.renderer.stats.depGraphSize = depGraph.getAllFiles().length;
    });

    const watchRoots = getWatchRoots(config, cwd);
    this.watcher.watch(watchRoots, {
      exts: [".ts", ".js", ".jsx", ".tsx", ".txt", ".script"],
      skip: [/\.d\.ts$/, /denoburner\.config\.(ts|js)$/],
      gitignore: true,
    });

    this.watcher.onChange(async (event) => {
      const relPath = relative(cwd, event.path);
      if (verbose) watchLog.info(`[${event.type}] ${relPath}`);

      if (event.type === "remove") {
        this.renameDetector.onRemove(event.path);
        return;
      }

      this.batcher.add(event.path);
    });

    this.watchLog.info(`Watching ${this.renderer.stats.watchedCount} file${this.renderer.stats.watchedCount === 1 ? "" : "s"}`);
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
