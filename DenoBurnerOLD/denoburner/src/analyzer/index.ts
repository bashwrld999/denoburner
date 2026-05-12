/**
 * Dependency Analyzer Module
 * 
 * Analyzes TypeScript/JavaScript files to determine their dependencies
 * and whether bundling is required.
 * 
 * Architecture:
 * - Parser: Strategy pattern for parsing imports (regex, AST)
 * - Classifier: Strategy pattern for classifying imports (protocol, server)
 * - Cache: Repository pattern for caching analysis results
 * - Analyzer: Facade combining all components
 */

// Main facade
export { DependencyAnalyzer } from "./dependency-analyzer-impl.ts";
export type { DependencyAnalyzerConfig } from "./dependency-analyzer-impl.ts";

// Types
export type {
  DependencyInfo,
  DependencyAnalyzerOptions,
  LocalImport,
  ExternalImport,
  ProjectFileImport,
  ParsedImport,
  ImportClassification,
  AnalysisContext,
} from "./types.ts";

// Interfaces
export type { ImportParser } from "./interfaces/import-parser.ts";
export type { ImportClassifier } from "./interfaces/import-classifier.ts";
export type { AnalysisCache, CacheEntry } from "./interfaces/analysis-cache.ts";

// Parsers
export { RegexImportParser } from "./parsers/regex-parser.ts";

// Classifiers
export { ProtocolClassifier } from "./classifiers/protocol-classifier.ts";
export { ServerClassifier } from "./classifiers/server-classifier.ts";

// Cache
export { InMemoryAnalysisCache } from "./cache/in-memory-cache.ts";

// Factory functions
import { DependencyAnalyzer } from "./dependency-analyzer-impl.ts";
import type { DependencyAnalyzerConfig } from "./dependency-analyzer-impl.ts";
import type { ImportParser, ImportClassifier, AnalysisCache } from "./interfaces/index.ts";

/**
 * Create a dependency analyzer with default components
 */
export function createAnalyzer(config: DependencyAnalyzerConfig = {}): DependencyAnalyzer {
  return new DependencyAnalyzer(config);
}

/**
 * Create a dependency analyzer with custom components
 */
export function createCustomAnalyzer(
  config: DependencyAnalyzerConfig,
  parser: ImportParser,
  classifiers: ImportClassifier[],
  cache?: AnalysisCache,
): DependencyAnalyzer {
  return new DependencyAnalyzer({
    ...config,
    parser,
    classifiers,
    cache,
  });
}
