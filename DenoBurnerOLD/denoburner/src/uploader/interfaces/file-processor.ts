/**
 * File Processor Interface
 * 
 * Strategy pattern for processing different file types.
 */

import type { HmrData } from "../../types.ts";
import type { ProcessedFile } from "../../bundler/types.ts";

/**
 * File Processor
 * 
 * Processes files based on their type and configuration.
 * Implementations handle different processing strategies:
 * - Bundling with external dependencies
 * - Transpiling TypeScript to JavaScript
 * - Raw file copying
 */
export interface FileProcessor {
  /**
   * Processor name for identification
   */
  readonly name: string;

  /**
   * Priority for processor selection (lower = higher priority)
   */
  readonly priority: number;

  /**
   * Check if this processor can handle the given file
   * @param file - File path
   * @param data - HMR data containing bundle/transpile settings
   * @returns true if this processor should handle the file
   */
  canProcess(file: string, data: HmrData): boolean | Promise<boolean>;

  /**
   * Process the file and return the result
   * @param file - File path
   * @param data - HMR data containing bundle/transpile settings
   * @returns Processed file with content and metadata
   */
  process(file: string, data: HmrData): Promise<ProcessedFile>;
}
