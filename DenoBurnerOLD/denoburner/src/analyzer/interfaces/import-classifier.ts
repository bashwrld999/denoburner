/**
 * Import Classifier Interface
 * 
 * Strategy pattern for classifying imports.
 */

import type { ImportClassification, AnalysisContext } from "../types.ts";

/**
 * Import Classifier Interface
 * 
 * Defines the contract for classifying import specifiers.
 * Classifiers can be chained to handle different import types.
 */
export interface ImportClassifier {
  /**
   * Classifier name for identification
   */
  readonly name: string;

  /**
   * Classifier priority (lower = runs first)
   */
  readonly priority?: number;

  /**
   * Classify an import specifier
   * @param specifier - The import specifier
   * @param context - Analysis context
   * @returns Classification result, or null if this classifier doesn't handle it
   */
  classify(
    specifier: string,
    context: AnalysisContext,
  ): ImportClassification | null;
}
