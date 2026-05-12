/**
 * Dependency Graph
 * 
 * Tracks file dependencies to enable cascading updates when shared files change.
 * When a file changes, all files that depend on it are identified for re-upload.
 * 
 * Designed to work with the existing DependencyAnalyzer from analyzer/.
 */

import type { DependencyInfo, LocalImport, ExternalImport, ProjectFileImport } from "../analyzer/types.ts";
import type { Logger, CategoryLogger } from "../logger/interfaces/index.ts";

/**
 * Dependency information for a file
 */
export interface DependencyNode {
  /** File path (relative to cwd) */
  file: string;
  /** Files this file imports (local imports only) */
  dependencies: Set<string>;
  /** Files that import this file (reverse mapping) */
  dependents: Set<string>;
  /** Last analyzed timestamp */
  analyzedAt: number;
  /** Whether the analysis is complete */
  complete: boolean;
  /** Server this file belongs to */
  server: string | null;
  /** External dependencies (npm, jsr, http) */
  externalDeps: string[];
}

/**
 * Options for the dependency graph
 */
export interface DependencyGraphOptions {
  /** Maximum depth for cascading updates (default: 10) */
  maxDepth?: number;
}

/**
 * Result of a dependency analysis
 */
export interface DependencyAnalysisResult {
  /** The file that was analyzed */
  file: string;
  /** Local dependencies found */
  dependencies: string[];
  /** Whether this is a new file or changed */
  isNew: boolean;
  /** Previous dependencies (if any) */
  previousDependencies?: string[];
  /** Added dependencies */
  addedDependencies: string[];
  /** Removed dependencies */
  removedDependencies: string[];
  /** External dependencies */
  externalDeps: string[];
  /** Whether bundling is needed */
  needsBundling: boolean;
}

/**
 * Cascading update result
 */
export interface CascadingUpdateResult {
  /** The source file that changed */
  sourceFile: string;
  /** All files affected by this change (including source) */
  affectedFiles: string[];
  /** Direct dependents of the source file */
  directDependents: string[];
  /** Transitive dependents (depend on dependents) */
  transitiveDependents: string[];
  /** Depth of the deepest dependency chain */
  maxDepth: number;
}

/**
 * Dependency Graph
 * 
 * Maintains a bidirectional mapping of file dependencies.
 * Supports efficient lookup of affected files when a file changes.
 * 
 * @example
 * ```ts
 * const graph = new DependencyGraph();
 * 
 * // After analyzing a file with DependencyAnalyzer
 * const info = await analyzer.analyze("src/servers/home/test.ts");
 * graph.updateFromFile("src/servers/home/test.ts", info, "home");
 * 
 * // When a file changes, get all affected files
 * const affected = graph.getAffectedFiles("src/servers/home/utils.ts");
 * console.log(affected.affectedFiles); // Files that need re-upload
 * ```
 */
export class DependencyGraph {
  private graph = new Map<string, DependencyNode>();
  private maxDepth: number;
  private log?: Logger | CategoryLogger;

  constructor(options: DependencyGraphOptions = {}, log?: Logger | CategoryLogger) {
    this.maxDepth = options.maxDepth ?? 10;
    this.log = log;
  }

  /**
   * Set logger for debugging
   */
  setLogger(log: Logger | CategoryLogger): void {
    this.log = log;
  }

  /**
   * Update the graph from DependencyAnalyzer results
   * 
   * @param file File path (relative to cwd)
   * @param info Analysis result from DependencyAnalyzer
   * @param server The server this file belongs to
   * @returns Analysis result with change information
   */
  updateFromFile(
    file: string,
    info: DependencyInfo,
    server: string | null
  ): DependencyAnalysisResult {
    // Extract local dependencies (same server folder)
    const localDeps = info.local.map((imp: LocalImport) => imp.specifier);
    // Extract project file dependencies (outside servers dir but still project files)
    const projectFileDeps = info.projectFiles.map((imp) => imp.resolvedPath);
    const externalDeps = info.external.map((imp: ExternalImport) => imp.specifier);
    
    // Combine local and project files for cascading updates
    const allDeps = [...localDeps, ...projectFileDeps];
    
    return this.analyze(file, allDeps, externalDeps, server);
  }

  /**
   * Analyze a file and update the dependency graph
   * 
   * @param file File path
   * @param localDeps Local dependencies (relative paths)
   * @param externalDeps External dependencies (npm:, jsr:, https:, etc.)
   * @param server The server this file belongs to
   * @returns Analysis result with change information
   */
  analyze(
    file: string,
    localDeps: string[],
    externalDeps: string[] = [],
    server: string | null = null
  ): DependencyAnalysisResult {
    const normalizedDeps = this.normalizeDependencies(localDeps, file);
    const existing = this.graph.get(file);
    
    const result: DependencyAnalysisResult = {
      file,
      dependencies: [...normalizedDeps],
      isNew: !existing,
      addedDependencies: [],
      removedDependencies: [],
      externalDeps,
      needsBundling: externalDeps.length > 0,
    };

    if (existing) {
      // Calculate diff
      const oldDeps = existing.dependencies;
      result.previousDependencies = [...oldDeps];
      result.addedDependencies = [...normalizedDeps].filter(d => !oldDeps.has(d));
      result.removedDependencies = [...oldDeps].filter(d => !normalizedDeps.has(d));
      
      // Update reverse mappings for removed dependencies
      for (const removedDep of result.removedDependencies) {
        this.removeFromDependents(removedDep, file);
      }
    }

    // Update the graph
    const node: DependencyNode = {
      file,
      dependencies: normalizedDeps,
      dependents: existing?.dependents ?? new Set(),
      analyzedAt: Date.now(),
      complete: true,
      server,
      externalDeps,
    };
    this.graph.set(file, node);

    // Update reverse mappings for new dependencies
    for (const dep of normalizedDeps) {
      this.addToDependents(dep, file);
    }

    this.log?.debug(
      `Analyzed ${file}: ${normalizedDeps.size} local deps, ${externalDeps.length} external, ${result.addedDependencies.length} added, ${result.removedDependencies.length} removed`
    );

    return result;
  }

  /**
   * Get all files affected by a change to the given file
   * 
   * @param file The file that changed
   * @returns Cascading update result with all affected files
   */
  getAffectedFiles(file: string): CascadingUpdateResult {
    const result: CascadingUpdateResult = {
      sourceFile: file,
      affectedFiles: [file],
      directDependents: [],
      transitiveDependents: [],
      maxDepth: 0,
    };

    const visited = new Set<string>([file]);
    const queue: Array<{ file: string; depth: number }> = [{ file, depth: 0 }];

    while (queue.length > 0) {
      const { file: currentFile, depth } = queue.shift()!;
      const node = this.graph.get(currentFile);

      if (!node) continue;

      for (const dependent of node.dependents) {
        if (visited.has(dependent)) continue;
        if (depth >= this.maxDepth) continue;

        visited.add(dependent);
        result.affectedFiles.push(dependent);

        if (depth === 0) {
          result.directDependents.push(dependent);
        } else {
          result.transitiveDependents.push(dependent);
        }

        result.maxDepth = Math.max(result.maxDepth, depth + 1);
        queue.push({ file: dependent, depth: depth + 1 });
      }
    }

    this.log?.debug(
      `Cascading update from ${file}: ${result.affectedFiles.length} files affected (depth: ${result.maxDepth})`
    );

    return result;
  }

  /**
   * Get dependencies of a file
   */
  getDependencies(file: string): string[] {
    const node = this.graph.get(file);
    return node ? [...node.dependencies] : [];
  }

  /**
   * Get dependents of a file (files that import this file)
   */
  getDependents(file: string): string[] {
    const node = this.graph.get(file);
    return node ? [...node.dependents] : [];
  }

  /**
   * Check if a file has been analyzed
   */
  has(file: string): boolean {
    return this.graph.has(file);
  }

  /**
   * Get dependency node for a file
   */
  get(file: string): DependencyNode | undefined {
    return this.graph.get(file);
  }

  /**
   * Remove a file from the graph
   */
  remove(file: string): void {
    const node = this.graph.get(file);
    if (!node) return;

    // Remove from reverse mappings
    for (const dep of node.dependencies) {
      this.removeFromDependents(dep, file);
    }

    // Remove from forward mappings of dependents
    for (const dependent of node.dependents) {
      const dependentNode = this.graph.get(dependent);
      if (dependentNode) {
        dependentNode.dependencies.delete(file);
      }
    }

    this.graph.delete(file);
    this.log?.debug(`Removed ${file} from dependency graph`);
  }

  /**
   * Clear the entire graph
   */
  clear(): void {
    this.graph.clear();
    this.log?.debug("Dependency graph cleared");
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    files: number;
    totalDependencies: number;
    totalDependents: number;
    avgDependencies: number;
    avgDependents: number;
    maxDependencies: number;
    maxDependents: number;
  } {
    let totalDeps = 0;
    let totalDependents = 0;
    let maxDeps = 0;
    let maxDependents = 0;

    for (const node of this.graph.values()) {
      const deps = node.dependencies.size;
      const dependents = node.dependents.size;
      totalDeps += deps;
      totalDependents += dependents;
      maxDeps = Math.max(maxDeps, deps);
      maxDependents = Math.max(maxDependents, dependents);
    }

    const files = this.graph.size;
    return {
      files,
      totalDependencies: totalDeps,
      totalDependents: totalDependents,
      avgDependencies: files > 0 ? totalDeps / files : 0,
      avgDependents: files > 0 ? totalDependents / files : 0,
      maxDependencies: maxDeps,
      maxDependents: maxDependents,
    };
  }

  /**
   * Get all files in the graph
   */
  getAllFiles(): string[] {
    return [...this.graph.keys()];
  }

  /**
   * Find circular dependencies
   */
  findCircularDependencies(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (file: string): boolean => {
      visited.add(file);
      recursionStack.add(file);
      path.push(file);

      const node = this.graph.get(file);
      if (node) {
        for (const dep of node.dependencies) {
          if (!visited.has(dep)) {
            if (dfs(dep)) {
              return true;
            }
          } else if (recursionStack.has(dep)) {
            // Found a cycle
            const cycleStart = path.indexOf(dep);
            cycles.push(path.slice(cycleStart));
            return true;
          }
        }
      }

      path.pop();
      recursionStack.delete(file);
      return false;
    };

    for (const file of this.graph.keys()) {
      if (!visited.has(file)) {
        dfs(file);
      }
    }

    return cycles;
  }

  /**
   * Normalize dependency paths relative to source file
   */
  private normalizeDependencies(dependencies: string[], sourceFile: string): Set<string> {
    const normalized = new Set<string>();
    const sourceDir = sourceFile.substring(0, sourceFile.lastIndexOf("/"));
    const cwd = Deno.cwd();
    
    for (const dep of dependencies) {
      // Skip external dependencies
      if (this.isExternal(dep)) {
        continue;
      }
      
      // Resolve relative paths
      let resolved = dep;
      if (dep.startsWith("./") || dep.startsWith("../")) {
        resolved = this.resolveRelative(sourceDir, dep);
      } else if (dep.startsWith("/")) {
        // Absolute path - convert to relative
        if (dep.startsWith(cwd)) {
          resolved = dep.slice(cwd.length + 1); // +1 to remove leading slash
        } else {
          // Outside cwd - skip
          continue;
        }
      }
      
      // Normalize the path
      const normalizedDep = this.normalizePath(resolved);
      if (normalizedDep) {
        normalized.add(normalizedDep);
      }
    }
    
    return normalized;
  }

  /**
   * Check if a dependency is external (npm, jsr, http)
   */
  private isExternal(dep: string): boolean {
    return (
      dep.startsWith("npm:") ||
      dep.startsWith("jsr:") ||
      dep.startsWith("http:") ||
      dep.startsWith("https:") ||
      dep.startsWith("node:")
    );
  }

  /**
   * Resolve a relative import path
   */
  private resolveRelative(sourceDir: string, importPath: string): string {
    if (importPath.startsWith("./")) {
      return `${sourceDir}/${importPath.slice(2)}`;
    }
    if (importPath.startsWith("../")) {
      const parts = sourceDir.split("/");
      const importParts = importPath.split("/");
      
      for (const part of importParts) {
        if (part === "..") {
          parts.pop();
        } else if (part !== ".") {
          parts.push(part);
        }
      }
      
      return parts.join("/");
    }
    return importPath;
  }

  /**
   * Normalize a file path
   */
  private normalizePath(path: string): string {
    // Normalize slashes
    let normalized = path.replaceAll("\\", "/");
    
    // Remove leading ./
    normalized = normalized.replace(/^\.\//, "");
    
    // Normalize slashes
    normalized = normalized.replaceAll("\\", "/");
    
    return normalized;
  }

  /**
   * Add a dependent to a dependency's reverse mapping
   */
  private addToDependents(dependency: string, dependent: string): void {
    let node = this.graph.get(dependency);
    if (!node) {
      // Create entry for dependency if it doesn't exist
      node = {
        file: dependency,
        dependencies: new Set(),
        dependents: new Set(),
        analyzedAt: 0,
        complete: false,
        server: null,
        externalDeps: [],
      };
      this.graph.set(dependency, node);
    }
    node.dependents.add(dependent);
  }

  /**
   * Remove a dependent from a dependency's reverse mapping
   */
  private removeFromDependents(dependency: string, dependent: string): void {
    const node = this.graph.get(dependency);
    if (node) {
      node.dependents.delete(dependent);
    }
  }
}

/**
 * Create a dependency graph instance
 */
export function createDependencyGraph(
  options?: DependencyGraphOptions,
  log?: Logger | CategoryLogger
): DependencyGraph {
  return new DependencyGraph(options, log);
}
