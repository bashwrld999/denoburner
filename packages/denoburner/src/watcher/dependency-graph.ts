export interface DependencyNode {
  file: string;
  dependencies: Set<string>;
  dependents: Set<string>;
  analyzedAt: number;
  server: string | null;
}

export interface CascadingUpdateResult {
  sourceFile: string;
  affectedFiles: string[];
  maxDepth: number;
}

export class DependencyGraph {
  private graph = new Map<string, DependencyNode>();
  private maxDepth: number;

  constructor(maxDepth = 10) {
    this.maxDepth = maxDepth;
  }

  update(file: string, localDeps: string[], server: string | null = null): void {
    const existing = this.graph.get(file);
    if (existing) {
      for (const dep of existing.dependencies) this.removeFromDependents(dep, file);
    }

    const normalizedDeps = this.normalizeDeps(localDeps, file);
    const node: DependencyNode = {
      file,
      dependencies: normalizedDeps,
      dependents: existing?.dependents ?? new Set(),
      analyzedAt: Date.now(),
      server,
    };
    this.graph.set(file, node);

    for (const dep of normalizedDeps) {
      let depNode = this.graph.get(dep);
      if (!depNode) {
        depNode = { file: dep, dependencies: new Set(), dependents: new Set(), analyzedAt: 0, server: null };
        this.graph.set(dep, depNode);
      }
      depNode.dependents.add(file);
    }
  }

  remove(file: string): void {
    const node = this.graph.get(file);
    if (!node) return;
    for (const dep of node.dependencies) this.removeFromDependents(dep, file);
    for (const dep of node.dependents) {
      const depNode = this.graph.get(dep);
      if (depNode) depNode.dependencies.delete(file);
    }
    this.graph.delete(file);
  }

  getAffectedFiles(file: string): CascadingUpdateResult {
    const result: CascadingUpdateResult = { sourceFile: file, affectedFiles: [file], maxDepth: 0 };
    const visited = new Set<string>([file]);
    const queue: Array<{ f: string; depth: number }> = [{ f: file, depth: 0 }];

    while (queue.length > 0) {
      const { f, depth } = queue.shift()!;
      const node = this.graph.get(f);
      if (!node) continue;
      for (const dep of node.dependents) {
        if (visited.has(dep)) continue;
        if (depth >= this.maxDepth) continue;
        visited.add(dep);
        result.affectedFiles.push(dep);
        result.maxDepth = Math.max(result.maxDepth, depth + 1);
        queue.push({ f: dep, depth: depth + 1 });
      }
    }
    return result;
  }

  getDependencies(file: string): string[] {
    return [...(this.graph.get(file)?.dependencies ?? [])];
  }

  getDependents(file: string): string[] {
    return [...(this.graph.get(file)?.dependents ?? [])];
  }

  has(file: string): boolean {
    return this.graph.has(file);
  }

  clear(): void {
    this.graph.clear();
  }

  getAllFiles(): string[] {
    return [...this.graph.keys()];
  }

  private normalizeDeps(deps: string[], sourceFile: string): Set<string> {
    const result = new Set<string>();
    const sourceDir = sourceFile.substring(0, Math.max(0, sourceFile.lastIndexOf("/")));
    for (const dep of deps) {
      if (dep.startsWith("npm:") || dep.startsWith("jsr:") || dep.startsWith("http:") || dep.startsWith("https:") || dep.startsWith("node:")) continue;
      if (dep.startsWith("./") || dep.startsWith("../")) {
        const resolved = resolveRelative(sourceDir, dep);
        result.add(resolved);
      } else {
        result.add(dep);
      }
    }
    return result;
  }

  private removeFromDependents(dependency: string, dependent: string): void {
    const node = this.graph.get(dependency);
    if (node) node.dependents.delete(dependent);
  }
}

function resolveRelative(sourceDir: string, importPath: string): string {
  const parts = sourceDir ? sourceDir.split("/") : [];
  const importParts = importPath.split("/");
  for (const part of importParts) {
    if (part === "..") { if (parts.length > 0) parts.pop(); }
    else if (part !== ".") parts.push(part);
  }
  return parts.join("/");
}
