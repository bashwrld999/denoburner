import { relative } from "@std/path";
import type { IPipeline, PipelineContext } from "../pipeline/types.ts";
import { HmrBatcher } from "../watcher/hmr_batcher.ts";
import { DependencyGraph } from "../watcher/dependency-graph.ts";
import { RenameDetector } from "./rename_detector.ts";
import { parseImports, resolveImportPath } from "./sync_orchestrator.ts";
import type { DenoburnerConfig } from "../config/types.ts";
import { toDenoburnerError } from "../core/errors.ts";
import { DEFAULT_CONFIG } from "../config/types.ts";
import type { FileCache } from "../state/cache.ts";
import type { RpcCommandExecutor } from "../rpc/command.ts";
import type { ILogger } from "../logger/interfaces.ts";

export class ChangeProcessor {
  private batcher: HmrBatcher;
  private renameDetector: RenameDetector;
  private depGraph: DependencyGraph;
  private sources = DEFAULT_CONFIG.sources!;
  private defaultServer = "home";

  constructor(
    private config: DenoburnerConfig,
    private pipeline: IPipeline,
    private cache: FileCache,
    private depGraphRaw: DependencyGraph,
    private executor: RpcCommandExecutor,
    private cwd: string,
    private watchLog: ILogger,
    private uploadLog: ILogger,
    private onStatsUpdate?: () => void,
  ) {
    this.sources = config.sources ?? DEFAULT_CONFIG.sources!;
    this.defaultServer = config.defaultServer ?? "home";
    this.depGraph = depGraphRaw;

    this.renameDetector = new RenameDetector(
      this.sources, this.cwd, this.defaultServer, this.depGraph,
      (path: string) => this.batcher.add(path),
    );

    this.batcher = new HmrBatcher(config.hmr?.batchDelay ?? 100, async (batch) => {
      await this.processBatch(batch);
    });
  }

  get batcherRef(): HmrBatcher {
    return this.batcher;
  }

  get renameDetectorRef(): RenameDetector {
    return this.renameDetector;
  }

  async processBatch(batch: string[]): Promise<void> {
    const isRename = this.renameDetector.hasPending();

    for (const changedFile of batch) {
      if (isRename) {
        this.cache.remove(changedFile, this.defaultServer);
      }

      let deps: string[] = [];
      try {
        const content = Deno.readTextFileSync(changedFile);
        deps = parseImports(content)
          .map((imp) => resolveImportPath(changedFile, imp))
          .filter((p): p is string => p !== null);
      } catch (err) {
        this.watchLog.warn(`Failed to analyze ${changedFile}: ${toDenoburnerError(err).message}`);
      }
      this.depGraph.update(changedFile, deps);
    }

    const allAffected = new Set<string>();
    for (const changedFile of batch) {
      for (const f of this.depGraph.getAffectedFiles(changedFile).affectedFiles) {
        allAffected.add(f);
      }
    }

    if (this.config.hmr?.maxCascadeDepth && allAffected.size > batch.length) {
      // Log cascading info — extracted from the old verbose check
    }

    for (const filePath of allAffected) {
      const ctx: PipelineContext = {
        localPath: filePath,
        gameServer: this.defaultServer,
        gameFilename: relative(this.cwd, filePath),
        startedAt: Date.now(),
      };
      await this.pipeline.run(ctx);
      if (ctx.error) {
        this.uploadLog.error(`Failed to upload ${ctx.gameFilename}: ${ctx.error.message}`);
      }
    }

    await this.renameDetector.flushDeletes(this.executor, this.uploadLog);
    this.onStatsUpdate?.();
  }

  onFileRemove(eventPath: string): void {
    this.renameDetector.onRemove(eventPath);
  }

  flush(): void {
    this.batcher.flush();
  }

  stop(): void {
    this.batcher.stop();
  }
}
