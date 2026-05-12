/**
 * Watch Item Specification
 * 
 * Specification that matches files against a ResolvedWatchItem.
 * Combines pattern matching with exclude patterns.
 */

import type { IFileSpecification, ICompositeSpecification } from "./interfaces.ts";
import { PatternSpecification, NotSpecification } from "./basic-specifications.ts";
import { AndSpecification, OrSpecification } from "./composite-specifications.ts";
import type { ResolvedWatchItem } from "../../config/types.ts";

/**
 * Watch Item Specification
 * 
 * Matches files against a watch item's pattern and exclude patterns.
 * A file matches if it matches the main pattern AND doesn't match any exclude patterns.
 */
export class WatchItemSpecification implements ICompositeSpecification {
  private includeSpec: IFileSpecification;
  private excludeSpecs: IFileSpecification[] = [];
  private combinedSpec: IFileSpecification;
  readonly description: string;
  readonly watchItem: ResolvedWatchItem;

  constructor(watchItem: ResolvedWatchItem) {
    this.watchItem = watchItem;
    this.includeSpec = new PatternSpecification(watchItem.pattern);
    
    // Build exclude specifications
    if (watchItem.exclude && watchItem.exclude.length > 0) {
      this.excludeSpecs = watchItem.exclude.map(ex => new PatternSpecification(ex));
    }
    
    // Combine: include AND NOT (exclude1 OR exclude2 OR ...)
    if (this.excludeSpecs.length > 0) {
      const excludeCombined = new OrSpecification(...this.excludeSpecs);
      this.combinedSpec = new AndSpecification(
        this.includeSpec,
        new NotSpecification(excludeCombined)
      );
    } else {
      this.combinedSpec = this.includeSpec;
    }
    
    this.description = `watchItem:${watchItem.pattern}`;
  }

  isSatisfiedBy(file: string): boolean {
    return this.combinedSpec.isSatisfiedBy(file);
  }

  /**
   * Get the include pattern specification
   */
  getIncludeSpec(): IFileSpecification {
    return this.includeSpec;
  }

  /**
   * Get the exclude pattern specifications
   */
  getExcludeSpecs(): IFileSpecification[] {
    return [...this.excludeSpecs];
  }

  /**
   * Get the combined specification
   */
  getCombinedSpec(): IFileSpecification {
    return this.combinedSpec;
  }

  add(spec: IFileSpecification): void {
    this.excludeSpecs.push(spec);
    this.rebuildCombinedSpec();
  }

  remove(spec: IFileSpecification): void {
    const index = this.excludeSpecs.indexOf(spec);
    if (index !== -1) {
      this.excludeSpecs.splice(index, 1);
      this.rebuildCombinedSpec();
    }
  }

  getSpecifications(): IFileSpecification[] {
    return [this.includeSpec, ...this.excludeSpecs];
  }

  private rebuildCombinedSpec(): void {
    if (this.excludeSpecs.length > 0) {
      const excludeCombined = new OrSpecification(...this.excludeSpecs);
      this.combinedSpec = new AndSpecification(
        this.includeSpec,
        new NotSpecification(excludeCombined)
      );
    } else {
      this.combinedSpec = this.includeSpec;
    }
  }
}

/**
 * Create a watch item specification
 */
export function watchItemSpec(item: ResolvedWatchItem): WatchItemSpecification {
  return new WatchItemSpecification(item);
}
