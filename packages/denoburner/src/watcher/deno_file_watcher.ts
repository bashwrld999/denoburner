import { extname } from "@std/path";
import type { IFileWatcher, FileChangeEvent, WatchOptions } from "./interface.ts";
import { toDenoburnerError } from "../core/errors.ts";

export class DenoFileWatcher implements IFileWatcher {
  private watcher: Deno.FsWatcher | null = null;
  private handlers: Set<(event: FileChangeEvent) => void> = new Set();
  private debounceTimers: Map<string, number> = new Map();
  private debounceMs: number;
  private closed = false;
  private options: WatchOptions = {};

  constructor(debounceMs = 150) {
    this.debounceMs = debounceMs;
  }

  watch(paths: string[], options?: WatchOptions): void {
    this.options = options ?? {};
    if (this.options.gitignore) {
      const gitPatterns = this.parseGitignore();
      if (gitPatterns.length > 0) {
        this.options.skip = [...(this.options.skip ?? []), ...gitPatterns];
      }
    }
    if (paths.length === 0) return;
    this.startWatcher(paths);
  }

  onChange(handler: (event: FileChangeEvent) => void): void {
    this.handlers.add(handler);
  }

  close(): void {
    this.closed = true;
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    if (this.watcher) {
      try { this.watcher.close(); } catch {
        // already closed
      }
      this.watcher = null;
    }
  }

  private async startWatcher(paths: string[]): Promise<void> {
    try {
      this.watcher = Deno.watchFs(paths, { recursive: true });

      for await (const event of this.watcher) {
        if (this.closed) break;

        for (const path of event.paths) {
          if (this.shouldSkip(path)) continue;

          const changeType = this.mapKind(event.kind);
          if (!changeType) continue;

          this.debounce(path, changeType);
        }
      }
      } catch (err) {
        console.error(`File watcher error: ${toDenoburnerError(err).message}`);
      }
  }

  private shouldSkip(path: string): boolean {
    const ext = extname(path).toLowerCase();

    if (this.options.exts && this.options.exts.length > 0) {
      if (!this.options.exts.includes(ext)) return true;
    }

    if (this.options.skip) {
      for (const pattern of this.options.skip) {
        if (pattern.test(path)) return true;
      }
    }

    return false;
  }

  private debounce(path: string, type: FileChangeEvent["type"]): void {
    const existing = this.debounceTimers.get(path);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(path);
      this.notify({ type, path });
    }, this.debounceMs);

    this.debounceTimers.set(path, timer);
  }

  private notify(event: FileChangeEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch {
        // handler error — logged at registration site
      }
    }
  }

  private parseGitignore(): RegExp[] {
    const patterns: RegExp[] = [];
    try {
      const content = Deno.readTextFileSync(".gitignore");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        if (trimmed.startsWith("/")) {
          patterns.push(new RegExp("^" + this.escapeRegex(trimmed.slice(1))));
        } else if (trimmed.endsWith("/")) {
          patterns.push(new RegExp(this.escapeRegex(trimmed)));
        } else {
          patterns.push(new RegExp(this.escapeRegex(trimmed)));
        }
      }
    } catch {
      // no .gitignore
    }
    return patterns;
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  }

  private mapKind(kind: Deno.FsEvent["kind"]): FileChangeEvent["type"] | null {
    switch (kind) {
      case "modify":
        return "modify";
      case "create":
        return "create";
      case "remove":
        return "remove";
      case "any":
        return "modify";
      default:
        return null;
    }
  }
}
