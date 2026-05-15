import { resolve, join, globToRegExp } from "@std/path";
import type { SourceEntry, BundleMode } from "../config/types.ts";

export interface SourcePathResult {
  server: string;
  filename: string;
  mode: BundleMode;
  sourceDir: string;
}

export function getSourceDirs(sources: SourceEntry[], cwd: string): string[] {
  const dirs = sources.map((s) => resolve(cwd, s.dir));
  return [...new Set(dirs)];
}

export function resolveSourcePath(
  filePath: string,
  sources: SourceEntry[],
  cwd: string,
  defaultServer: string,
): SourcePathResult | null {
  for (const source of sources) {
    const sourceDir = resolve(cwd, source.dir);
    const sep = sourceDir + "/";
    if (!filePath.startsWith(sep)) continue;

    const relativePath = filePath.substring(sep.length);

    const mode = resolveMode(relativePath, source);

    if (source.server) {
      return { server: source.server, filename: relativePath, mode, sourceDir };
    }

    const slashIdx = relativePath.indexOf("/");
    if (slashIdx === -1) {
      return { server: defaultServer, filename: relativePath, mode, sourceDir };
    }

    return {
      server: relativePath.substring(0, slashIdx),
      filename: relativePath.substring(slashIdx + 1),
      mode,
      sourceDir,
    };
  }

  return null;
}

function resolveMode(relativePath: string, source: SourceEntry): BundleMode {
  if (source.patterns && source.patterns.length > 0) {
    for (const p of source.patterns) {
      try {
        const regex = globToRegExp(p.pattern, { extended: true, globstar: true });
        if (regex.test(relativePath)) return p.mode;
      } catch {
        // invalid pattern, skip
      }
    }
  }
  return source.mode ?? autoDetectMode(relativePath);
}

export function resolveSourceServerRoot(
  filePath: string,
  sources: SourceEntry[],
  cwd: string,
): string | null {
  for (const source of sources) {
    const sourceDir = resolve(cwd, source.dir);
    const sep = sourceDir + "/";
    if (!filePath.startsWith(sep)) continue;

    const relativePath = filePath.substring(sep.length);

    if (source.server) {
      return sourceDir;
    }

    const slashIdx = relativePath.indexOf("/");
    if (slashIdx === -1) return null;

    const serverName = relativePath.substring(0, slashIdx);
    return join(sourceDir, serverName);
  }
  return null;
}

function autoDetectMode(filename: string): BundleMode {
  if (/\.(tsx?|mts|cts|jsx?|mjs|cjs)$/i.test(filename)) return "bundle";
  return "passthrough";
}
