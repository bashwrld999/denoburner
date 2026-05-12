/**
 * File Processor Interface
 * 
 * Strategy pattern for processing files.
 */

import type { ProcessedFile, BundleMode } from "../types.ts";
import type { PluginManager } from "../plugin-manager.ts";
import type { DependencyAnalyzer } from "../../analyzer/index.ts";

/**
 * Build context passed to processors
 */
export interface BuildContext {
  /** Bundler options */
  options: {
    sourceMap: boolean;
    minify: boolean;
    target: string;
  };
  /** Target server */
  server: string;
  /** Bundle mode */
  bundleMode: BundleMode;
  /** Whether to transpile TypeScript */
  transpile: boolean;
  /** Plugin manager */
  pluginManager: PluginManager;
  /** Dependency analyzer */
  analyzer: DependencyAnalyzer;
}

/**
 * File Processor Interface
 * 
 * Defines how files should be processed.
 * Different processors handle different file types or bundling modes.
 */
export interface FileProcessor {
  /**
   * Processor name for identification
   */
  readonly name: string;

  /**
   * Check if this processor can handle the file
   * @param filePath - Path to the file
   * @param context - Build context
   * @returns True if this processor can handle the file
   */
  canProcess(filePath: string, context: BuildContext): boolean;

  /**
   * Process a file
   * @param filePath - Path to the file
   * @param context - Build context
   * @returns Processed file result
   */
  process(filePath: string, context: BuildContext): Promise<ProcessedFile>;
}
