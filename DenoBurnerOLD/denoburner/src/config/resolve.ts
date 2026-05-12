/**
 * Configuration resolution
 */

import type {
  DenoBurnerConfig,
  ResolvedDenoBurnerConfig,
  ResolvedWatchItem,
  WatchItem,
  WatchPreset,
  WatchCondition,
} from "./types.ts";
import { DEFAULT_THEME, WATCH_PRESETS } from "./types.ts";
import type { BundleMode } from "../bundler/types.ts";
import { globToRegExp } from "jsr:@std/path/posix";

/**
 * Parse server path to extract server name and file path
 */
function parseServerPath(path: string): { serverName: string | null; filePath: string } {
  const normalized = path.replaceAll("\\", "/");
  const serversIndex = normalized.indexOf("/servers/");
  
  if (serversIndex !== -1) {
    const afterServers = normalized.slice(serversIndex + "/servers/".length);
    const parts = afterServers.split("/");
    const serverName = parts[0];
    const filePath = parts.slice(1).join("/");
    
    return {
      serverName,
      filePath,
    };
  }

  // No servers directory found, use entire path as filename
  return {
    serverName: null,
    filePath: normalized.replace(/^\//, ""),
  };
}

/**
 * Resolve watch location function
 */
export function resolveWatchLocation(location: WatchItem["location"]) {
  return (filename: string) => {
    // Get all possible filenames
    const { serverName, filePath } = parseServerPath(filename);
    let result = location ?? serverName ?? "home";
    
    if (typeof result === "function") {
      const resolved = result(filename);
      if (!resolved) {
        return [];
      }
      result = resolved;
    }
    
    if (!Array.isArray(result)) {
      result = [result];
    }
    
    return result.map((r) => {
      const itemResult = {
        filename: filePath,
        server: serverName ?? "home",
        ...(typeof r === "string" ? { server: r } : r),
      };
      return itemResult;
    });
  };
}

/**
 * Infer settings from file extension
 */
function inferFromFile(file: string): Partial<WatchItem> {
  const ext = file.split(".").pop()?.toLowerCase();
  
  switch (ext) {
    case "ts":
    case "tsx":
      return {
        transform: true,
        transpile: true,
        bundle: "external" as BundleMode,
      };
    case "js":
    case "jsx":
      return {
        transform: true,
        transpile: false,
        bundle: "external" as BundleMode,
      };
    case "txt":
    case "script":
    case "json":
    case "md":
      return {
        transform: false,
      };
    default:
      return {
        transform: false,
      };
  }
}

/**
 * Check if a file matches a condition
 */
function matchesCondition(file: string, condition: WatchCondition): boolean {
  // Check path pattern
  if (condition.path) {
    const patterns = Array.isArray(condition.path) ? condition.path : [condition.path];
    for (const pattern of patterns) {
      const regex = globToRegExp(pattern, { extended: true, globstar: true });
      if (regex.test(file)) {
        return true;
      }
    }
    return false;
  }
  
  // Check extension
  if (condition.ext) {
    const exts = Array.isArray(condition.ext) ? condition.ext : [condition.ext];
    const fileExt = file.split(".").pop()?.toLowerCase();
    if (fileExt && exts.includes(fileExt)) {
      return true;
    }
    return false;
  }
  
  // Check directory
  if (condition.dir) {
    const dirs = Array.isArray(condition.dir) ? condition.dir : [condition.dir];
    const normalized = file.replaceAll("\\", "/");
    for (const dir of dirs) {
      const dirPattern = dir.replace(/\*/g, ".*");
      if (new RegExp(dirPattern).test(normalized)) {
        return true;
      }
    }
    return false;
  }
  
  // Check custom test function
  if (condition.test) {
    return condition.test(file);
  }
  
  return false;
}

/**
 * Apply conditions to a watch item for a specific file
 */
export function applyConditions(item: ResolvedWatchItem, file: string): ResolvedWatchItem {
  if (!item.conditions || item.conditions.length === 0) {
    return item;
  }
  
  // Find first matching condition
  for (const condition of item.conditions) {
    if (matchesCondition(file, condition)) {
      // Apply condition settings
      return {
        ...item,
        transform: condition.transform ?? item.transform,
        bundle: condition.bundle ?? item.bundle,
        transpile: condition.transpile ?? item.transpile,
        location: condition.location 
          ? resolveWatchLocation(condition.location) 
          : item.location,
      };
    }
  }
  
  return item;
}

/**
 * Check if a file should be excluded
 */
export function shouldExclude(file: string, exclude: string | string[] | undefined): boolean {
  if (!exclude) return false;
  
  const patterns = Array.isArray(exclude) ? exclude : [exclude];
  const normalized = file.replaceAll("\\", "/");
  
  for (const pattern of patterns) {
    const regex = globToRegExp(pattern, { extended: true, globstar: true });
    if (regex.test(normalized)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  port: 12525,
  timeout: 10000,
  logLevel: "debug" as const,
  sourceMap: false,
  minify: false,
  outDir: "dist",
  rootDir: Deno.cwd(),
  serversDir: "src/servers",
  ignoreInitial: false,
  theme: DEFAULT_THEME,
  download: {
    servers: ["home"],
    location: (file: string, server: string) => `src/servers/${server}/${file}`,
    ignoreTs: true,
    ignoreSourcemap: true,
  },
  upload: {
    strategy: "parallel" as const,
    concurrency: 5,
    ramDelay: 200,
    batchSize: 10,
    batchTimeout: 1000,
  },
  hmr: {
    cascadingUpdates: true,
    maxCascadeDepth: 10,
    batching: true,
    batchDelay: 50,
    maxBatchSize: 100,
    caching: true,
    trackChanges: true,
  },
};

/**
 * Resolve a single watch item
 */
function resolveWatchItem(item: WatchItem): ResolvedWatchItem {
  // Start with preset if specified
  let resolved: Partial<WatchItem> = {};
  
  if (item.preset) {
    resolved = { ...WATCH_PRESETS[item.preset] };
  }
  
  // Override with explicit settings
  if (item.transform !== undefined) resolved.transform = item.transform;
  if (item.bundle !== undefined) resolved.bundle = item.bundle;
  if (item.transpile !== undefined) resolved.transpile = item.transpile;
  if (item.location !== undefined) resolved.location = item.location;
  
  // Apply defaults
  const transform = resolved.transform ?? false;
  const bundle = resolved.bundle ?? "external";
  const transpile = resolved.transpile ?? true;
  
  // Normalize exclude to array
  const exclude = item.exclude
    ? Array.isArray(item.exclude)
      ? item.exclude
      : [item.exclude]
    : undefined;

  return {
    pattern: item.pattern,
    transform,
    bundle: transform ? bundle : false,
    transpile,
    location: resolveWatchLocation(resolved.location),
    // New fields
    exclude,
    conditions: item.conditions,
    infer: item.infer ?? false,
    cascadeOnly: item.cascadeOnly ?? false,
  };
}

/**
 * Derive project file patterns from watch patterns
 * 
 * For patterns like "src/servers/**\/*.ts", derives "src/**\/*.ts" to watch
 * project files outside servers directory for cascading updates.
 */
function deriveProjectFilePatterns(items: ResolvedWatchItem[]): ResolvedWatchItem[] {
  const derived: ResolvedWatchItem[] = [];
  const seenPatterns = new Set<string>();
  
  // Track existing patterns to avoid duplicates
  for (const item of items) {
    seenPatterns.add(item.pattern);
  }
  
  for (const item of items) {
    // Skip cascade-only items (don't derive from them)
    if (item.cascadeOnly) continue;
    
    // Look for patterns like "src/servers/**\/*.{ts,tsx}"
    const serversMatch = item.pattern.match(/^(.+?)\/servers\/(.+)$/);
    if (serversMatch) {
      const [, baseDir, filePattern] = serversMatch;
      // Create a pattern for the base directory
      const projectPattern = `${baseDir}/${filePattern}`;
      
      // Avoid duplicates
      if (!seenPatterns.has(projectPattern)) {
        seenPatterns.add(projectPattern);
        derived.push({
          pattern: projectPattern,
          transform: false, // Don't process these files
          bundle: false,
          transpile: false,
          location: resolveWatchLocation(undefined),
          cascadeOnly: true, // Only for cascading updates
          exclude: [
            `${baseDir}/servers/**`, // Exclude the servers directory itself
          ],
        });
      }
    }
  }
  
  return derived;
}

/**
 * Resolve full configuration
 */
export function resolveConfig(config: DenoBurnerConfig): ResolvedDenoBurnerConfig {
  // Resolve user-provided watch items
  const resolvedWatch = config.watch.map(resolveWatchItem);
  
  // Automatically derive project file patterns for cascading updates
  const derivedPatterns = deriveProjectFilePatterns(resolvedWatch);
  
  return {
    port: config.port ?? DEFAULT_CONFIG.port,
    timeout: config.timeout ?? DEFAULT_CONFIG.timeout,
    logLevel: config.logLevel ?? DEFAULT_CONFIG.logLevel,
    sourceMap: config.sourceMap ?? DEFAULT_CONFIG.sourceMap,
    minify: config.minify ?? DEFAULT_CONFIG.minify,
    outDir: config.outDir ?? DEFAULT_CONFIG.outDir,
    rootDir: config.rootDir ?? DEFAULT_CONFIG.rootDir,
    serversDir: config.serversDir ?? DEFAULT_CONFIG.serversDir,
    watch: [...resolvedWatch, ...derivedPatterns],
    ignoreInitial: config.ignoreInitial ?? DEFAULT_CONFIG.ignoreInitial,
    theme: { ...DEFAULT_CONFIG.theme, ...config.theme },
    download: {
      ...DEFAULT_CONFIG.download,
      ...config.download,
    },
    upload: {
      ...DEFAULT_CONFIG.upload,
      ...config.upload,
    },
    hmr: {
      ...DEFAULT_CONFIG.hmr,
      ...config.hmr,
    },
  };
}
