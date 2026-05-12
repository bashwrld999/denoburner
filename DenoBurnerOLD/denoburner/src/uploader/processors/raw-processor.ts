/**
 * Raw Processor
 * 
 * Processes files that don't need transformation.
 */

import type { FileProcessor } from "../interfaces/index.ts";
import type { HmrData } from "../../types.ts";
import type { ProcessedFile } from "../../bundler/types.ts";
import { basename } from "jsr:@std/path";

/**
 * Raw Processor
 * 
 * Handles files that should be uploaded as-is:
 * - Files with transform: false
 * - Non-TypeScript/JavaScript files
 * - Files that don't match other processors
 */
export class RawProcessor implements FileProcessor {
  readonly name = "raw";
  readonly priority = 100; // Lowest priority - fallback processor

  canProcess(file: string, data: HmrData): boolean {
    // Always return true as this is the fallback processor
    return true;
  }

  async process(file: string, data: HmrData): Promise<ProcessedFile> {
    const content = await Deno.readTextFile(file);
    const filename = basename(file);
    const server = this.extractServer(file, data);

    return {
      filename,
      content,
      bundled: false,
      bundledDeps: 0,
      server,
    };
  }

  private extractServer(file: string, data: HmrData): string {
    const locations = data.location(file);
    return locations[0]?.server || "home";
  }
}
