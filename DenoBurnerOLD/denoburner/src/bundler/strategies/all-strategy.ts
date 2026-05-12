/**
 * All Strategy
 * 
 * Bundle everything including local imports.
 */

import type { BundlerStrategy } from "../interfaces/bundler-strategy.ts";
import type { DependencyInfo } from "../../analyzer/types.ts";

/**
 * All Strategy
 * 
 * Bundles everything including local imports from the same server.
 * Use this when you want a single self-contained file.
 */
export class AllStrategy implements BundlerStrategy {
  readonly name = "all";

  /**
   * Always bundle
   */
  shouldBundle(_info: DependencyInfo): boolean {
    return true;
  }

  /**
   * No external patterns - bundle everything
   */
  getExternalPatterns(_filePath: string): string[] {
    return [];
  }
}
