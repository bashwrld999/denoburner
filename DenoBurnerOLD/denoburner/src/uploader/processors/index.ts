/**
 * File Processors
 * 
 * Exports all file processors for the uploader module.
 */

export { BundlerProcessor } from "./bundler-processor.ts";
export { RawProcessor } from "./raw-processor.ts";

import type { FileProcessor } from "../interfaces/index.ts";
import { BundlerProcessor } from "./bundler-processor.ts";
import { RawProcessor } from "./raw-processor.ts";
import { Bundler } from "../../bundler/index.ts";

/**
 * Create default processors with the given bundler
 */
export function createDefaultProcessors(bundler: Bundler): FileProcessor[] {
  return [
    new BundlerProcessor(bundler),
    new RawProcessor(), // Fallback processor (lowest priority)
  ];
}

/**
 * Find the best processor for a file
 * 
 * Iterates through processors sorted by priority and returns the first one
 * that can handle the file. Supports async canProcess.
 */
export async function findProcessor(
  processors: FileProcessor[],
  file: string,
  data: import("../../types.ts").HmrData,
): Promise<FileProcessor> {
  // Sort by priority (lower = higher priority)
  const sorted = [...processors].sort((a, b) => a.priority - b.priority);

  // Find first processor that can handle the file
  for (const processor of sorted) {
    const canProcess = await processor.canProcess(file, data);
    if (canProcess) {
      return processor;
    }
  }

  // Should never reach here if RawProcessor is included
  throw new Error(`No processor found for file: ${file}`);
}
