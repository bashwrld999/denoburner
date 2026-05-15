import type { DenoburnerConfig } from "../config/types.ts";
import type { IPipeline } from "../pipeline/types.ts";
import type { IBundler } from "../bundler/interface.ts";
import type { ILogger } from "../logger/interfaces.ts";
import type { DevEnvironment } from "../environment.ts";
import type { DenoburnerPlugin } from "../plugin/types.ts";
import { aggregateHooks } from "../plugin/types.ts";
import type { AggregatedHooks } from "../plugin/types.ts";
import { createUploadPipeline, createBuildPipeline } from "../pipeline/factory.ts";

export class PipelineOrchestrator {
  private _uploadPipeline: IPipeline | null = null;
  private uploadLog?: ILogger;
  private hooks: AggregatedHooks;

  constructor(
    private config: DenoburnerConfig,
    private bundler: IBundler,
    private env: DevEnvironment,
    private logger: ILogger,
    private cwd: string,
    plugins: DenoburnerPlugin[] = [],
  ) {
    this.hooks = aggregateHooks(plugins);
  }

  get uploadPipeline(): IPipeline {
    if (!this._uploadPipeline) {
      this._uploadPipeline = createUploadPipeline(
        this.config, this.bundler, this.env.commandExecutor,
        this.env.eventBus, this.logger, this.env.cache,
        this.env.uploadQueue, this.uploadLog, this.cwd, this.hooks,
      );
    }
    return this._uploadPipeline;
  }

  createBuildPipeline(outDir?: string): IPipeline {
    return createBuildPipeline(
      this.config, this.bundler, this.env.eventBus, this.logger,
      this.cwd, outDir, this.hooks,
    );
  }

  closeBundler(): Promise<void> {
    const b = this.bundler as unknown as { close?: () => Promise<void> };
    if (typeof b.close === "function") {
      return b.close();
    }
    return Promise.resolve();
  }
}
