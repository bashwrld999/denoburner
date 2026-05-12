/**
 * Pattern Filter Processor
 * 
 * Filters files by glob patterns from watch items using the Specification Pattern.
 */

import type { EventProcessor } from "../interfaces/index.ts";
import type { WatcherContext, ProcessedFile } from "../types.ts";
import type { ResolvedWatchItem } from "../../config/types.ts";
import type { WatchItemSpecification } from "../specifications/index.ts";
import { watchItemSpec } from "../specifications/index.ts";
import { relative } from "jsr:@std/path";

/**
 * Pattern Filter Processor
 * 
 * Filters file events by the configured watch patterns.
 * Files that don't match any pattern are removed from the context.
 * Uses the Specification Pattern for composable file matching.
 */
export class PatternFilterProcessor implements EventProcessor {
  readonly name = "pattern-filter";
  private specifications: WatchItemSpecification[];
  private cwd: string;
  
  constructor(patterns: ResolvedWatchItem[], cwd: string = Deno.cwd()) {
    // Pre-build specifications for each watch item
    this.specifications = patterns.map(item => watchItemSpec(item));
    this.cwd = cwd;
  }
  
  /**
   * Get specifications (for external use/testing)
   */
  getSpecifications(): WatchItemSpecification[] {
    return [...this.specifications];
  }
  
  async process(ctx: WatcherContext, next: () => Promise<void>): Promise<void> {
    const processedFiles: ProcessedFile[] = [];
    
    for (const path of ctx.event.paths) {
      // Normalize path to relative
      const normalized = path.replaceAll("\\", "/");
      const relativePath = relative(this.cwd, normalized).replaceAll("\\", "/");
      
      // Find matching specification (uses Specification Pattern)
      const matchingSpec = this.specifications.find((spec) =>
        spec.isSatisfiedBy(relativePath)
      );
      
      if (matchingSpec) {
        processedFiles.push({
          path: relativePath,
          event: ctx.event.kind,
          watchItem: matchingSpec.watchItem,
        });
      }
    }
    
    // Update context with filtered files
    ctx.files = processedFiles;
    
    // Continue chain if there are matching files
    if (ctx.files.length > 0) {
      await next();
    }
  }
}
