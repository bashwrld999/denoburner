/**
 * Dependency Analyzer
 * 
 * Analyzes a file's imports to determine if bundling is needed.
 * Uses Strategy pattern for different import classification strategies.
 */

import { resolve, dirname, normalize } from "jsr:@std/path";
import type {
  DependencyInfo,
  DependencyAnalyzerOptions,
  LocalImport,
  ExternalImport,
} from "./types.ts";

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
 * Regular expressions for parsing imports
 */
const IMPORT_PATTERNS = {
  // Static imports: import ... from 'specifier'
  static: /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s*['"]([^'"]+)['"]/g,
  // Dynamic imports: import('specifier')
  dynamic: /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // Export from: export ... from 'specifier'
  exportFrom: /export\s+(?:type\s+)?(?:\{[^}]*\}|\*)\s*from\s*['"]([^'"]+)['"]/g,
};

/**
 * Dependency Analyzer
 * 
 * Analyzes TypeScript/JavaScript files to determine their dependencies
 * and whether bundling is required.
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

  constructor(options: Partial<DependencyAnalyzerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Analyze a file's dependencies
   */
  async analyze(filePath: string): Promise<DependencyInfo> {
    const absolutePath = this.resolvePath(filePath);
    const content = await this.readFile(absolutePath);
    const imports = this.parseImports(content);
    
    const local: LocalImport[] = [];
    const external: ExternalImport[] = [];
    const projectFiles: { specifier: string; resolvedPath: string; line: number }[] = [];

    for (const { specifier, line } of imports) {
      const classification = this.classifyImport(specifier, absolutePath);
      
      if (classification.type === "local") {
        local.push({
          specifier,
          resolvedPath: classification.resolvedPath,
          line,
        });
      } else if (classification.resolvedPath) {
        // Relative import outside servers dir - track for cascading updates
        projectFiles.push({
          specifier,
          resolvedPath: classification.resolvedPath,
          line,
        });
        external.push({
          specifier,
          type: classification.importType ?? "other",
          line,
        });
      } else {
        external.push({
          specifier,
          type: classification.importType ?? "other",
          line,
        });
      }
    }

    return {
      local,
      external,
      projectFiles,
      needsBundling: external.length > 0,
    };
  }

  /**
   * Parse all imports from file content
   */
  private parseImports(content: string): Array<{ specifier: string; line: number }> {
    const imports: Array<{ specifier: string; line: number }> = [];
    const lines = content.split("\n");

    // Process each line to get accurate line numbers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check all import patterns
      for (const pattern of Object.values(IMPORT_PATTERNS)) {
        // Reset regex lastIndex
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(line)) !== null) {
          imports.push({ specifier: match[1], line: lineNum });
        }
      }
    }

    // Remove duplicates
    const seen = new Set<string>();
    return imports.filter(({ specifier }) => {
      if (seen.has(specifier)) return false;
      seen.add(specifier);
      return true;
    });
  }

  /**
   * Classify an import as local or external
   */
  private classifyImport(
    specifier: string,
    sourceFile: string,
  ): { type: "local"; resolvedPath: string } | { type: "external"; importType: ExternalImport["type"]; resolvedPath?: string } {
    // Check for external protocols
    if (specifier.startsWith("npm:")) {
      return { type: "external", importType: "npm" };
    }
    if (specifier.startsWith("jsr:")) {
      return { type: "external", importType: "jsr" };
    }
    if (specifier.startsWith("https://") || specifier.startsWith("http://")) {
      return { type: "external", importType: "http" };
    }

    // Resolve relative import
    const resolvedPath = this.resolveImport(specifier, sourceFile);
    const sourceServer = this.getServerFromPath(sourceFile);
    const importServer = this.getServerFromPath(resolvedPath);

    // Both must be in the same server folder
    if (sourceServer && importServer && sourceServer === importServer) {
      return { type: "local", resolvedPath };
    }

    // Different server or outside servers directory
    // Include resolvedPath for all relative imports (for cascading updates)
    // - If importServer exists: it's a file in a different server folder
    // - If importServer is null: it's a project file outside servers dir (still track for cascading)
    return { 
      type: "external", 
      importType: importServer ? "file" : "other",
      resolvedPath, // Always include resolvedPath for relative imports
    };
  }

  /**
   * Resolve import specifier relative to source file
   */
  private resolveImport(specifier: string, sourceFile: string): string {
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      const dir = dirname(sourceFile);
      return normalize(resolve(dir, specifier));
    }
    return specifier;
  }

  /**
   * Get the server name from a file path
   * Returns null if the file is not in the servers directory
   */
  private getServerFromPath(filePath: string): string | null {
    const normalized = normalize(filePath);
    const serversDir = resolveServersDir(this.options.serversDir, this.options.rootDir);
    const normalizedServersDir = normalize(serversDir);
    
    // Check if path starts with serversDir
    if (!normalized.startsWith(normalizedServersDir)) {
      return null;
    }

    // Extract server name: serversDir/{serverName}/...
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

// Export types
export * from "./types.ts";
