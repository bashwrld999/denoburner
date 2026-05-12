/**
 * Raw Processor
 * 
 * Returns files as-is without any transformation.
 */

import type { FileProcessor, BuildContext } from "../interfaces/file-processor.ts";
import type { ProcessedFile } from "../types.ts";
import { basename } from "jsr:@std/path";

/**
 * Raw Processor
 * 
 * Processes files without any transformation.
 * Keeps the original extension since Bitburner can parse TypeScript.
 */
export class RawProcessor implements FileProcessor {
  readonly name = "raw";

  /**
   * Can process any file when bundle mode is false
   */
  canProcess(_filePath: string, context: BuildContext): boolean {
    return context.bundleMode === false;
  }

  /**
   * Return file as-is
   */
  async process(filePath: string, context: BuildContext): Promise<ProcessedFile> {
    const content = await Deno.readTextFile(filePath);
    const filename = basename(filePath);

    return {
      filename,
      content,
      bundled: false,
      bundledDeps: 0,
      server: context.server,
    };
  }
}
