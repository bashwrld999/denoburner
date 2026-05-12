import { relative, globToRegExp } from "@std/path";
import type { PipelineStage, PipelineContext } from "../types.ts";
import type { DenoburnerConfig, WatchEntry } from "../../config/types.ts";

export class GlobFilterStage implements PipelineStage {
  readonly name = "glob_filter";

  constructor(private config: DenoburnerConfig) {}

  async execute(ctx: PipelineContext): Promise<void> {
    const relPath = relative(Deno.cwd(), ctx.localPath);
    const match = this.findMatch(relPath);

    if (!match) {
      ctx.skipped = true;
      ctx.skipReason = `No matching watch pattern for ${relPath}`;
      return;
    }

    ctx.mode = match.mode;
    ctx.serverOverride = match.server;
  }

  private findMatch(relPath: string): WatchEntry | undefined {
    const ignorePatterns = this.config.ignore ?? [];
    for (const pattern of ignorePatterns) {
      if (globMatch(pattern, relPath)) {
        return undefined;
      }
    }

    for (const entry of this.config.watch) {
      if (globMatch(entry.pattern, relPath)) {
        return entry;
      }
    }

    return undefined;
  }
}

function globMatch(pattern: string, input: string): boolean {
  try {
    const regex = globToRegExp(pattern, { extended: true, globstar: true });
    return regex.test(input);
  } catch {
    return false;
  }
}
