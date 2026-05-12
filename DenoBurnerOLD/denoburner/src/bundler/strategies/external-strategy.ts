/**
 * External Strategy
 * 
 * Bundle only external dependencies, keep local imports as-is.
 */

import type { BundlerStrategy } from "../interfaces/bundler-strategy.ts";
import type { DependencyInfo } from "../../analyzer/types.ts";

/**
 * External Strategy
 * 
 * Bundles external dependencies (npm, jsr, http) but keeps local imports
 * from the same server folder as-is. This is the default strategy.
 */
export class ExternalStrategy implements BundlerStrategy {
  readonly name = "external";

  /**
   * Determine if bundling is needed
   * Returns true if there are external dependencies
   */
  shouldBundle(info: DependencyInfo): boolean {
    return info.external.length > 0;
  }

  /**
   * Get patterns for files that should be external
   * Excludes .d.ts files as they're type-only
   */
  getExternalPatterns(_filePath: string): string[] {
    // Always exclude .d.ts files from bundling - they're type-only
    return ["*.d.ts"];
  }
}
