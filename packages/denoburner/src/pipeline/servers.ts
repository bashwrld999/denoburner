import { resolve } from "@std/path";
import type { DenoburnerConfig } from "../config/types.ts";

export function getWatchRoots(config: DenoburnerConfig, cwd: string): string[] {
  const roots = new Set<string>();
  for (const entry of config.watch) {
    const seg = entry.pattern.split(/[/\\*]/)[0];
    if (seg && !seg.startsWith("*") && !seg.startsWith(".")) {
      roots.add(resolve(cwd, seg));
    }
  }
  if (roots.size === 0) roots.add(cwd);
  return [...roots];
}

export interface ServerPathResult {
  server: string;
  relativePath: string;
}

export function parseServerPath(localPath: string, serversDir = "src/servers"): ServerPathResult | null {
  const normalizedPath = localPath.replace(/\\/g, "/");
  const dir = serversDir.replace(/\\/g, "/").replace(/\/+$/, "");
  const searchStr = `/${dir}/`;

  const idx = normalizedPath.indexOf(searchStr);
  if (idx === -1) return null;

  const after = normalizedPath.substring(idx + searchStr.length);
  const slashIdx = after.indexOf("/");
  if (slashIdx === -1) return null;

  return {
    server: after.substring(0, slashIdx),
    relativePath: after.substring(slashIdx + 1),
  };
}

export function resolveServerRoot(localPath: string, serversDir = "src/servers"): string | null {
  const parsed = parseServerPath(localPath, serversDir);
  if (!parsed) return null;
  const dir = serversDir.replace(/\\/g, "/").replace(/\/+$/, "");
  const searchStr = `/${dir}/`;
  const idx = localPath.indexOf(searchStr);
  if (idx === -1) return null;
  return localPath.substring(0, idx + searchStr.length + parsed.server.length);
}
