/**
 * Server Classifier
 * 
 * Classifies imports based on server folder location.
 */

import { resolve, dirname, normalize } from "jsr:@std/path";
import type { ImportClassifier } from "../interfaces/import-classifier.ts";
import type { ImportClassification, AnalysisContext } from "../types.ts";

/**
 * Server Classifier
 * 
 * Determines if an import is:
 * - Local: From the same server folder
 * - External: From a different server or outside servers directory
 */
export class ServerClassifier implements ImportClassifier {
  readonly name = "server";
  readonly priority = 20; // Run after protocol classifier

  /**
   * Classify imports based on server folder
   */
  classify(specifier: string, context: AnalysisContext): ImportClassification | null {
    // Only handle relative imports
    if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
      // Bare specifiers (like "lodash") are external
      return { type: "external", importType: "other" };
    }

    // Resolve the import path
    const resolvedPath = this.resolveImport(specifier, context.sourceFile);
    const importServer = this.getServerFromPath(resolvedPath, context);

    // Check if both source and import are in the same server
    if (context.sourceServer && importServer && context.sourceServer === importServer) {
      return { type: "local", resolvedPath };
    }

    // Different server or outside servers directory
    // Include resolvedPath for project files (outside servers dir but still relative imports)
    return {
      type: "external",
      importType: importServer ? "file" : "other",
      resolvedPath: importServer ? undefined : resolvedPath,
    };
  }

  /**
   * Resolve import specifier relative to source file
   */
  private resolveImport(specifier: string, sourceFile: string): string {
    const dir = dirname(sourceFile);
    return normalize(resolve(dir, specifier));
  }

  /**
   * Get the server name from a file path
   */
  private getServerFromPath(filePath: string, context: AnalysisContext): string | null {
    const normalized = normalize(filePath);
    const normalizedServersDir = normalize(context.serversDir);

    // Check if path starts with serversDir
    if (!normalized.startsWith(normalizedServersDir)) {
      return null;
    }

    // Extract server name: serversDir/{serverName}/...
    const relativePath = normalized.slice(normalizedServersDir.length + 1);
    const parts = relativePath.split(/[/\\]/);

    return parts[0] || null;
  }
}
