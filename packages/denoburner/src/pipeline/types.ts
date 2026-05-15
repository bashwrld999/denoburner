import type { BundleMode } from "../config/types.ts";

export interface PipelineContext {
  localPath: string;
  gameServer: string;
  gameFilename: string;
  rawContent?: string;
  bundledContent?: string;
  outPath?: string;
  byteSize?: number;
  ramCost?: number;
  mode?: BundleMode;
  skipped?: boolean;
  skipReason?: string;
  error?: Error;
  startedAt: number;
  finishedAt?: number;
}

export interface PipelineStage {
  readonly name: string;
  execute(ctx: PipelineContext): Promise<void>;
}

export interface IPipeline {
  use(stage: PipelineStage): IPipeline;
  run(ctx: PipelineContext): Promise<PipelineContext>;
  runAll(contexts: PipelineContext[]): Promise<PipelineContext[]>;
}
