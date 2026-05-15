import { walk } from "@std/fs";
import { relative, dirname, resolve } from "@std/path";
import ignore from "ignore";
import type { IPipeline, PipelineContext } from "../pipeline/types.ts";
import type { DependencyGraph } from "../watcher/dependency-graph.ts";
import type { ILogger } from "../logger/interfaces.ts";
import type { DenoburnerConfig } from "../config/types.ts";
import { getSourceDirs } from "../pipeline/source-mapper.ts";

export class SyncOrchestrator {
  files: string[] = [];

  constructor(
    private config: DenoburnerConfig,
    private depGraph: DependencyGraph,
    private pipeline: IPipeline,
    private syncLog: ILogger,
    private uploadLog: ILogger,
    private cwd: string,
  ) {}

  async scanFiles(): Promise<void> {
    this.files = [];
    const dirs = getSourceDirs(this.config.sources ?? [], this.cwd);
    const filter = createGitignoreFilter(this.cwd);
    for (const root of dirs) {
      for await (const entry of walk(root, {
        exts: [".ts", ".js", ".jsx", ".tsx", ".txt", ".script", ".json", ".md", ".mjs", ".cjs", ".mts", ".cts"],
        skip: [/\.d\.ts$/, /(^|\/)\.\w/],
      })) {
        if (entry.isFile && !entry.name.startsWith(".") && !filter(entry.path)) {
          this.files.push(entry.path);
        }
      }
    }
  }

  prePopulateGraph(): void {
    for (const f of this.files) {
      this.depGraph.update(f, []);
    }
  }

  async runInitialSync(): Promise<number> {
    if (this.config.skipInitialSync) return 0;

    this.syncLog.info(`Uploading ${this.files.length} files...`);

    const CHUNK_SIZE = 100;
    let successCount = 0;
    let errorCount = 0;
    let unchangedSkipped = 0;
    let patternMissed = 0;
    const allErrors: Array<{ filename: string; error: Error }> = [];

    for (let i = 0; i < this.files.length; i += CHUNK_SIZE) {
      const chunk = this.files.slice(i, i + CHUNK_SIZE);
      const contexts: PipelineContext[] = chunk.map((f) => ({
        localPath: f,
        gameServer: this.config.defaultServer ?? "home",
        gameFilename: relative(this.cwd, f),
        startedAt: Date.now(),
      }));

      const results = await this.pipeline.runAll(contexts);

      for (const r of results) {
        if (r.error) {
          errorCount++;
          allErrors.push({ filename: r.gameFilename, error: r.error });
        } else if (r.skipped) {
          if (r.skipReason?.startsWith("File")) unchangedSkipped++;
          else patternMissed++;
        } else successCount++;
      }

      if (i + CHUNK_SIZE < this.files.length) {
        this.syncLog.info(`Progress: ${successCount + errorCount + unchangedSkipped}/${this.files.length}`);
      }
    }

    const matchedCount = successCount + errorCount + unchangedSkipped;
    const plural = (n: number) => n === 1 ? "" : "s";

    if (errorCount > 0) {
      this.syncLog.warn(`Uploaded ${successCount} file${plural(successCount)}, ${errorCount} failed, ${unchangedSkipped} unchanged`);
      for (const e of allErrors) {
        this.uploadLog.error(`${e.filename}: ${e.error.message}`);
      }
    } else if (unchangedSkipped > 0) {
      this.syncLog.success(`Uploaded ${successCount} file${plural(successCount)}, ${unchangedSkipped} unchanged`);
    } else {
      this.syncLog.success(`Uploaded ${successCount} file${plural(successCount)}`);
    }

    return matchedCount;
  }
}

export function parseImports(content: string): string[] {
  const deps: string[] = [];
  const patterns = [
    /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+(?:\s*,\s*\{[^}]*\})?)\s+from\s+["']([^"']+)["']/g,
    /export\s+(?:\{[^}]*\}|\*)\s+from\s+["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      if (!deps.includes(match[1])) deps.push(match[1]);
    }
  }
  return deps;
}

export function resolveImportPath(sourceFile: string, importPath: string): string | null {
  if (importPath.startsWith("npm:") || importPath.startsWith("jsr:") || importPath.startsWith("http:") || importPath.startsWith("https:") || importPath.startsWith("node:")) {
    return null;
  }
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    const sourceDir = dirname(sourceFile);
    return resolve(sourceDir, importPath);
  }
  return null;
}

function createGitignoreFilter(cwd: string): (path: string) => boolean {
  try {
    const content = Deno.readTextFileSync(resolve(cwd, ".gitignore"));
    const ig = ignore().add(content);
    return (path: string) => {
      const rel = path.startsWith(cwd + "/") ? path.substring(cwd.length + 1) : path;
      return ig.ignores(rel);
    };
  } catch {
    return () => false;
  }
}
