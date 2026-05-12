/**
 * Types for the Dependency Analyzer module
 */

/**
 * Parsed import from source code
 */
export interface ParsedImport {
  /** Original import specifier */
  specifier: string;
  /** Line number in the source file */
  line: number;
  /** Type of import statement */
  type: "static" | "dynamic" | "export-from";
}

/**
 * Import classification result
 */
export interface ImportClassification {
  /** Whether the import is local or external */
  type: "local" | "external";
  /** For local imports and external file imports: the resolved file path */
  resolvedPath?: string;
  /** For external imports: the type of external import */
  importType?: "npm" | "jsr" | "http" | "file" | "other";
}

/**
 * Information about a file's dependencies
 */
export interface DependencyInfo {
  /** Imports from the same server folder (local) */
  local: LocalImport[];
  /** Imports from external sources (npm, jsr, http, different server) */
  external: ExternalImport[];
  /** Project files (relative imports outside servers dir - for cascading updates) */
  projectFiles: ProjectFileImport[];
  /** Whether the file needs bundling */
  needsBundling: boolean;
}

/**
 * Local import from the same server folder
 */
export interface LocalImport {
  /** Original import specifier */
  specifier: string;
  /** Resolved file path relative to project root */
  resolvedPath: string;
  /** Line number in the source file */
  line: number;
}

/**
 * External import (npm, jsr, http, or different server)
 */
export interface ExternalImport {
  /** Original import specifier */
  specifier: string;
  /** Type of external import */
  type: "npm" | "jsr" | "http" | "file" | "other";
  /** Line number in the source file */
  line: number;
}

/**
 * Project file import (relative import outside servers dir)
 * Used for cascading updates but not considered "local" for bundling
 */
export interface ProjectFileImport {
  /** Original import specifier */
  specifier: string;
  /** Resolved file path relative to project root */
  resolvedPath: string;
  /** Line number in the source file */
  line: number;
}

/**
 * Options for the dependency analyzer
 */
export interface DependencyAnalyzerOptions {
  /** Root directory for resolving paths */
  rootDir: string;
  /** Servers directory pattern (default: "src/servers") */
  serversDir: string;
}

/**
 * Analysis context for classifiers
 */
export interface AnalysisContext {
  /** Root directory for resolving paths */
  rootDir: string;
  /** Servers directory path */
  serversDir: string;
  /** Source file being analyzed */
  sourceFile: string;
  /** Server name of the source file */
  sourceServer: string | null;
}
