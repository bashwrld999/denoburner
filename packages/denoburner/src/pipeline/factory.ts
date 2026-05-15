import type { DenoburnerConfig } from "../config/types.ts";
import type { ILogger } from "../logger/interfaces.ts";
import type { ITuiEventBus } from "../tui/interfaces.ts";
import type { IPipeline, PipelineStage } from "./types.ts";
import type { IBundler } from "../bundler/interface.ts";
import type { FileCache } from "../state/cache.ts";
import type { UploadQueueManager } from "../state/queue.ts";
import type { AggregatedHooks } from "../plugin/types.ts";

import { GlobFilterStage } from "./stages/glob_filter.ts";
import { ReadFileStage } from "./stages/read_file.ts";
import { BundleStage } from "./stages/bundle.ts";
import { RamCheckStage } from "./stages/ram_check.ts";
import { UploadStage } from "./stages/upload.ts";
import { WriteDistStage } from "./stages/write_dist.ts";
import { NotifyStage } from "./stages/notify.ts";
import { UploadPipeline } from "./pipeline.ts";
import { TimingStageDecorator } from "./decorators/timing_decorator.ts";
import type { RpcCommandExecutor } from "../rpc/command.ts";
import type { IRpcClient } from "../rpc/client.ts";

/** Wraps a stage with timing logging only (no retry — RPC stages handle their own retries). */
function decorate(stage: PipelineStage, logger: ILogger): PipelineStage {
  return new TimingStageDecorator(stage, logger);
}

export function createUploadPipeline(
  config: DenoburnerConfig,
  bundler: IBundler,
  executor: RpcCommandExecutor,
  eventBus: ITuiEventBus,
  logger: ILogger,
  cache?: FileCache,
  uploadQueue?: UploadQueueManager,
  uploadLog?: ILogger,
  cwd?: string,
  hooks?: AggregatedHooks,
): IPipeline {
  const cw = cwd ?? Deno.cwd();
  const sources = config.sources ?? [{ dir: "src" }];
  const defaultServer = config.defaultServer ?? "home";

  return new UploadPipeline()
    .use(decorate(new GlobFilterStage(sources, cw, defaultServer), logger))
    .use(decorate(new ReadFileStage(), logger))
    .use(decorate(new BundleStage(bundler, sources, cw, hooks), logger))
    .use(decorate(new RamCheckStage(executor), logger))
    .use(decorate(new UploadStage(executor, cache, uploadQueue, uploadLog, hooks), logger))
    .use(new NotifyStage(eventBus));
}

export function createBuildPipeline(
  config: DenoburnerConfig,
  bundler: IBundler,
  eventBus: ITuiEventBus,
  logger: ILogger,
  cwd?: string,
  outDir?: string,
  hooks?: AggregatedHooks,
): IPipeline {
  const cw = cwd ?? Deno.cwd();
  const sources = config.sources ?? [{ dir: "src" }];
  const defaultServer = config.defaultServer ?? "home";
  const distDir = outDir ?? "./dist";

  return new UploadPipeline()
    .use(decorate(new GlobFilterStage(sources, cw, defaultServer), logger))
    .use(decorate(new ReadFileStage(), logger))
    .use(decorate(new BundleStage(bundler, sources, cw, hooks), logger))
    .use(decorate(new WriteDistStage(distDir), logger))
    .use(new NotifyStage(eventBus));
}
