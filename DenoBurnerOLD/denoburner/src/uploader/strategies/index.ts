/**
 * Upload Strategies
 * 
 * Exports all upload strategies for the uploader module.
 */

export { ImmediateStrategy } from "./immediate-strategy.ts";
export { BatchedStrategy } from "./batched-strategy.ts";
export type { BatchedStrategyOptions } from "./batched-strategy.ts";
export { ParallelStrategy, createParallelStrategy } from "./parallel-strategy.ts";
export type { ParallelUploadOptions } from "./parallel-strategy.ts";

import type { UploadStrategy } from "../interfaces/index.ts";
import type { CategoryLogger } from "../../logger/interfaces/index.ts";
import { ImmediateStrategy } from "./immediate-strategy.ts";
import { BatchedStrategy, type BatchedStrategyOptions } from "./batched-strategy.ts";
import { ParallelStrategy, type ParallelUploadOptions } from "./parallel-strategy.ts";
import type { RemoteApiServer } from "../../remote-api/index.ts";

/**
 * Strategy type
 */
export type StrategyType = "immediate" | "batched" | "parallel";

/**
 * Strategy options union type
 */
export interface StrategyOptions extends BatchedStrategyOptions, ParallelUploadOptions {
  /** Alias for maxSize (batched strategy) */
  batchSize?: number;
  /** Alias for timeout (batched strategy) */
  batchTimeout?: number;
}

/**
 * Create default upload strategy
 */
export function createDefaultStrategy(
  server: RemoteApiServer,
  type: StrategyType = "parallel",
  options?: StrategyOptions,
  log?: CategoryLogger,
): UploadStrategy {
  switch (type) {
    case "batched":
      return new BatchedStrategy(server, {
        maxSize: options?.batchSize ?? options?.maxSize,
        timeout: options?.batchTimeout ?? options?.timeout,
        ramDelay: options?.ramDelay,
        log,
      });
    case "parallel":
      return new ParallelStrategy(server, options);
    case "immediate":
    default:
      return new ImmediateStrategy(server, options?.ramDelay, log);
  }
}
