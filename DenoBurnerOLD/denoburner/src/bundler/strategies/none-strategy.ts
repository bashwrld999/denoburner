/**
 * None Strategy
 * 
 * Don't bundle anything - return files as-is.
 */

import type { BundlerStrategy } from "../interfaces/bundler-strategy.ts";
import type { DependencyInfo } from "../../analyzer/types.ts";

/**
 * None Strategy
 * 
 * Never bundles files. Files are returned as-is.
 * Use this for files that should not be processed.
 */
export class NoneStrategy implements BundlerStrategy {
  readonly name = "none";

  /**
   * Never bundle
   */
  shouldBundle(_info: DependencyInfo): boolean {
    return false;
  }

  /**
   * No external patterns needed
   */
  getExternalPatterns(_filePath: string): string[] {
    return [];
  }
}
