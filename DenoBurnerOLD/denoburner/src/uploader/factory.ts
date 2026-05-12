/**
 * Uploader Factory
 * 
 * Factory functions for creating configured uploader instances.
 */

import type { RemoteApiServer } from "../remote-api/index.ts";
import type { Bundler } from "../bundler/index.ts";
import type { ResolvedDenoBurnerConfig } from "../config/types.ts";
import type { FileProcessor, UploadStrategy, StatsRepository, Pipeline } from "./interfaces/index.ts";
import type { StrategyOptions } from "./strategies/index.ts";
import type { CategoryLogger } from "../logger/interfaces/index.ts";
import { UploaderOrchestrator } from "./uploader.ts";
import { createDefaultProcessors } from "./processors/index.ts";
import { createDefaultStrategy } from "./strategies/index.ts";
import { createStatsRepository } from "./repository/index.ts";
import { createPipeline, createDefaultStages } from "./pipeline/index.ts";

/**
 * Create an uploader with default configuration
 */
export function createUploader(
  server: RemoteApiServer,
  bundler: Bundler,
  config: ResolvedDenoBurnerConfig,
  log?: CategoryLogger,
): UploaderOrchestrator {
  // Create processors
  const processors = createDefaultProcessors(bundler);

  // Create strategy options from config
  const strategyOptions: StrategyOptions = {
    concurrency: config.upload.concurrency,
    ramDelay: config.upload.ramDelay,
    batchSize: config.upload.batchSize,
    batchTimeout: config.upload.batchTimeout,
  };

  // Create strategy
  const strategy = createDefaultStrategy(server, config.upload.strategy, strategyOptions, log);

  // Create repository
  const repository = createStatsRepository();

  // Create pipeline
  const pipeline = createPipeline();
  const stages = createDefaultStages(processors, strategy, repository);

  for (const stage of stages) {
    pipeline.add(stage);
  }

  return new UploaderOrchestrator(server, processors, strategy, repository, pipeline);
}

/**
 * Create an uploader with custom components
 * Useful for testing or advanced configurations
 */
export function createCustomUploader(
  server: RemoteApiServer,
  processors: FileProcessor[],
  strategy: UploadStrategy,
  repository: StatsRepository,
  pipeline: Pipeline,
): UploaderOrchestrator {
  return new UploaderOrchestrator(server, processors, strategy, repository, pipeline);
}
