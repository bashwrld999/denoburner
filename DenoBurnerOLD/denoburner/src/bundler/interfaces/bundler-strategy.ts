/**
 * Bundler Strategy Interface
 * 
 * Strategy pattern for different bundling modes.
 */

import type { DependencyInfo } from "../../analyzer/types.ts";

/**
 * Bundler Strategy Interface
 * 
 * Defines how files should be bundled.
 * Different strategies handle external dependencies differently.
 */
export interface BundlerStrategy {
  /**
   * Strategy name for identification
   */
  readonly name: string;

  /**
   * Determine if a file should be bundled based on its dependencies
   * @param info - Dependency information
   * @returns True if the file should be bundled
   */
  shouldBundle(info: DependencyInfo): boolean;

  /**
   * Get patterns for files that should be external (not bundled)
   * @param filePath - The file being bundled
   * @returns Array of external patterns
   */
  getExternalPatterns(filePath: string): string[];
}
