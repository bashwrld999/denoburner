/**
 * Protocol Classifier
 * 
 * Classifies imports by their protocol prefix (npm:, jsr:, https:, etc.)
 */

import type { ImportClassifier } from "../interfaces/import-classifier.ts";
import type { ImportClassification, AnalysisContext } from "../types.ts";

/**
 * Protocol Classifier
 * 
 * Handles imports with protocol prefixes:
 * - npm: - NPM packages
 * - jsr: - JSR packages
 * - https:/http: - HTTP URLs
 */
export class ProtocolClassifier implements ImportClassifier {
  readonly name = "protocol";
  readonly priority = 10; // Run first

  /**
   * Classify protocol-based imports
   */
  classify(specifier: string, _context: AnalysisContext): ImportClassification | null {
    // NPM packages
    if (specifier.startsWith("npm:")) {
      return { type: "external", importType: "npm" };
    }

    // JSR packages
    if (specifier.startsWith("jsr:")) {
      return { type: "external", importType: "jsr" };
    }

    // HTTP URLs
    if (specifier.startsWith("https://") || specifier.startsWith("http://")) {
      return { type: "external", importType: "http" };
    }

    // Not a protocol import
    return null;
  }
}
