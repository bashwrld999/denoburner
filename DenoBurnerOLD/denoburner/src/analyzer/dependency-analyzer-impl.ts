/**
 * Dependency Analyzer
 * 
 * Main facade for analyzing file dependencies.
 * Combines parser, classifiers, and cache.
 */

import { resolve, normalize } from "jsr:@std/path";
import type { ImportParser } from "./interfaces/import-parser.ts";
import type { ImportClassifier } from "./interfaces/import-classifier.ts";
import type { AnalysisCache } from "./interfaces/analysis-cache.ts";
import type {
  DependencyInfo,
  LocalImport,
  ExternalImport,
  ProjectFileImport,
  DependencyAnalyzerOptions,
  AnalysisContext,
} from "./types.ts";
import { RegexImportParser } from "./parsers/regex-parser.ts";
import { ProtocolClassifier, ServerClassifier } from "./classifiers/index.ts";
import { InMemoryAnalysisCache } from "./cache/in-memory-cache.ts";

const DEFAULT_OPTIONS: DependencyAnalyzerOptions = {
  rootDir: Deno.cwd(),
  serversDir: "src/servers",
};

/**
 * Resolve the servers directory to an absolute path
 */
function resolveServersDir(serversDir: string, rootDir: string): string {
  if (serversDir.startsWith("/")) {
    return serversDir;
  }
  return resolve(rootDir, serversDir);
}

/**
 * Dependency Analyzer Options with components
 */
export interface DependencyAnalyzerConfig extends Partial<DependencyAnalyzerOptions> {
  parser?: ImportParser;
  classifiers?: ImportClassifier[];
  cache?: AnalysisCache;
}

/**
 * Dependency Analyzer
 * 
 * Analyzes TypeScript/JavaScript files to determine their dependencies
 * and whether bundling is required.
 * 
 * Uses Strategy pattern for parsing and classification.
 * Uses Repository pattern for caching.
 * 
 * @example
 * ```ts
 * const analyzer = new DependencyAnalyzer();
 * const info = await analyzer.analyze("src/servers/home/test.ts");
 * console.log(info.needsBundling); // true if external deps exist
 * ```
 */
export class DependencyAnalyzer {
  private readonly options: DependencyAnalyzerOptions;
  private readonly parser: ImportParser;
  private readonly classifiers: ImportClassifier[];
  private readonly cache: AnalysisCache;

  constructor(config: DependencyAnalyzerConfig = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...config };
    
    // Use provided components or defaults
    this.parser = config.parser ?? new RegexImportParser();
    this.classifiers = config.classifiers ?? [
      new ProtocolClassifier(),
      new ServerClassifier(),
    ];
    this.cache = config.cache ?? new InMemoryAnalysisCache();
  }

  /**
   * Analyze a file's dependencies
   */
  async analyze(filePath: string): Promise<DependencyInfo> {
    const absolutePath = this.resolvePath(filePath);

    // Check cache
    const stat = await Deno.stat(absolutePath);
    if (this.cache.isValid(absolutePath, stat.mtime?.getTime() ?? 0)) {
      const cached = this.cache.get(absolutePath);
      if (cached) return cached;
    }

    // Read and parse
    const content = await this.readFile(absolutePath);
    const imports = this.parser.parse(content);

    // Build context
    const context: AnalysisContext = {
      rootDir: this.options.rootDir,
      serversDir: resolveServersDir(this.options.serversDir, this.options.rootDir),
      sourceFile: absolutePath,
      sourceServer: this.getServerFromPath(absolutePath),
    };

    // Classify imports
    const local: LocalImport[] = [];
    const external: ExternalImport[] = [];
    const projectFiles: ProjectFileImport[] = [];

    for (const { specifier, line } of imports) {
      const classification = this.classifyImport(specifier, context);

      if (classification.type === "local") {
        local.push({
          specifier,
          resolvedPath: classification.resolvedPath ?? specifier,
          line,
        });
      } else {
        external.push({
          specifier,
          type: classification.importType ?? "other",
          line,
        });
        // Track project files (relative imports outside servers dir)
        if (classification.resolvedPath) {
          projectFiles.push({
            specifier,
            resolvedPath: classification.resolvedPath,
            line,
          });
        }
      }
    }

    const info: DependencyInfo = {
      local,
      external,
      projectFiles,
      needsBundling: external.length > 0,
    };

    // Cache result
    this.cache.set(absolutePath, info, stat.mtime?.getTime() ?? Date.now());

    return info;
  }

  /**
   * Invalidate cache for a file
   */
  invalidate(filePath: string): void {
    const absolutePath = this.resolvePath(filePath);
    this.cache.invalidate(absolutePath);
  }

  /**
   * Clear all cached results
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Classify an import using the classifier chain
   */
  private classifyImport(specifier: string, context: AnalysisContext) {
    // Sort classifiers by priority
    const sorted = [...this.classifiers].sort(
      (a, b) => (a.priority ?? 100) - (b.priority ?? 100),
    );

    // Try each classifier
    for (const classifier of sorted) {
      const result = classifier.classify(specifier, context);
      if (result) return result;
    }

    // Default: treat as external
    return { type: "external" as const, importType: "other" as const };
  }

  /**
   * Get the server name from a file path
   */
  private getServerFromPath(filePath: string): string | null {
    const normalized = normalize(filePath);
    const serversDir = resolveServersDir(this.options.serversDir, this.options.rootDir);
    const normalizedServersDir = normalize(serversDir);

    if (!normalized.startsWith(normalizedServersDir)) {
      return null;
    }

    const relativePath = normalized.slice(normalizedServersDir.length + 1);
    const parts = relativePath.split(/[/\\]/);

    return parts[0] || null;
  }

  /**
   * Resolve file path relative to root directory
   */
  private resolvePath(filePath: string): string {
    if (filePath.startsWith("/")) {
      return filePath;
    }
    return resolve(this.options.rootDir, filePath);
  }

  /**
   * Read file content
   */
  private async readFile(absolutePath: string): Promise<string> {
    try {
      return await Deno.readTextFile(absolutePath);
    } catch (error) {
      throw new Error(`Failed to read file ${absolutePath}: ${error}`);
    }
  }
}
