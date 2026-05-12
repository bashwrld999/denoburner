import type { DenoburnerConfig } from "../config/types.ts";
import type { ILogger } from "../logger/interfaces.ts";
import type { ITuiEventBus } from "../tui/interfaces.ts";
import type { IPipeline, PipelineStage } from "./types.ts";
import type { IBundler } from "../bundler/interface.ts";
import type { FileCache } from "../state/cache.ts";
import type { UploadQueueManager } from "../state/queue.ts";

import { GlobFilterStage } from "./stages/glob_filter.ts";
import { ReadFileStage } from "./stages/read_file.ts";
import { BundleStage } from "./stages/bundle.ts";
import { PathMapStage } from "./stages/path_map.ts";
import { RamCheckStage } from "./stages/ram_check.ts";
import { UploadStage } from "./stages/upload.ts";
import { WriteDistStage } from "./stages/write_dist.ts";
import { NotifyStage } from "./stages/notify.ts";
import { UploadPipeline } from "./pipeline.ts";
import { TimingStageDecorator } from "./decorators/timing_decorator.ts";
import { RetryStageDecorator } from "./decorators/retry_decorator.ts";
import type { RpcCommandExecutor } from "../rpc/command.ts";

function decorate(stage: PipelineStage, logger: ILogger): PipelineStage {
  return new TimingStageDecorator(
    new RetryStageDecorator(stage, 2, 200, logger),
    logger,
  );
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
): IPipeline {
  return new UploadPipeline()
    .use(decorate(new GlobFilterStage(config), logger))
    .use(decorate(new ReadFileStage(), logger))
    .use(decorate(new BundleStage(bundler, config.serversDir), logger))
    .use(decorate(new PathMapStage(config), logger))
    .use(decorate(new RamCheckStage(executor), logger))
    .use(decorate(new UploadStage(executor, cache, uploadQueue, uploadLog), logger))
    .use(new NotifyStage(eventBus));
}

export function createBuildPipeline(
  config: DenoburnerConfig,
  bundler: IBundler,
  eventBus: ITuiEventBus,
  logger: ILogger,
): IPipeline {
  return new UploadPipeline()
    .use(decorate(new GlobFilterStage(config), logger))
    .use(decorate(new ReadFileStage(), logger))
    .use(decorate(new BundleStage(bundler, config.serversDir), logger))
    .use(decorate(new PathMapStage(config), logger))
    .use(decorate(new WriteDistStage(config), logger))
    .use(new NotifyStage(eventBus));
}
