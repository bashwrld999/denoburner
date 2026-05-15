import { isAbsolute, resolve } from "@std/path";
import type { DenoburnerConfig, SourceEntry } from "./types.ts";
import { DEFAULT_CONFIG } from "./types.ts";
import { toDenoburnerError } from "../core/errors.ts";

const V1_KEYS = ["watch", "serversDir", "ignore", "ignoreInitial", "outDir"] as const;

export function defineConfig(config: Partial<DenoburnerConfig>): DenoburnerConfig {
  return mergeConfig(DEFAULT_CONFIG, config);
}

export async function loadConfig(configPath?: string): Promise<DenoburnerConfig> {
  const tryPath = async (path: string): Promise<DenoburnerConfig | null> => {
    // Resolve relative paths against CWD, not this module's location
    const absPath = isAbsolute(path) ? path : resolve(Deno.cwd(), path);
    const mod = await import(absPath);
    const exported = mod.default ?? mod.config;
    if (!exported) return null;

    const oldMsg = detectOldConfig(exported);
    if (oldMsg) throw new Error(oldMsg);

    return mergeConfig(DEFAULT_CONFIG, exported);
  };

  if (configPath) {
    try {
      const result = await tryPath(configPath);
      if (result) return result;
      throw new Error(`Config at ${configPath} must have a default export`);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("v1 format") ||
        err.message.includes("must have a default export")
      )) throw err;
      throw new Error(
        `Failed to load config from ${configPath}: ${toDenoburnerError(err).message}`,
      );
    }
  }

  const cwd = Deno.cwd();
  const autoPaths = [
    resolve(cwd, "denoburner.config.ts"),
    resolve(cwd, "denoburner.config.js"),
    resolve(cwd, "denoburner/config.ts"),
  ];
  const loadErrors: string[] = [];

  for (const p of autoPaths) {
    try {
      const result = await tryPath(p);
      if (result) return result;
      loadErrors.push(`${p}: no default export`);
    } catch (err) {
      loadErrors.push(`${p}: ${toDenoburnerError(err).message}`);
    }
  }

  return { ...DEFAULT_CONFIG };
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export function validateConfig(config: DenoburnerConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.defaultServer) errors.push("defaultServer is required");

  if (!config.port || config.port < 1 || config.port > 65535) {
    errors.push("port must be 1-65535");
  }

  if (!config.host) {
    errors.push("host is required");
  }

  if (!config.sources || config.sources.length === 0) {
    errors.push("at least one source entry is required");
  }

  const validModes = new Set(["passthrough", "transpile", "bundle"]);
  for (const s of config.sources ?? []) {
    if (!s.dir) errors.push("source entry missing dir");
    if (s.mode !== undefined && !validModes.has(s.mode)) {
      errors.push(`source "${s.dir}" has invalid mode "${s.mode}"`);
    }
    if (s.server !== undefined && typeof s.server !== "string") {
      errors.push(`source "${s.dir}" server must be a string`);
    }
    if (s.patterns) {
      if (!Array.isArray(s.patterns)) {
        errors.push(`source "${s.dir}" patterns must be an array`);
      } else {
        for (const p of s.patterns) {
          if (!p.pattern) errors.push(`source "${s.dir}" pattern missing pattern string`);
          if (p.mode !== undefined && !validModes.has(p.mode)) {
            errors.push(`source "${s.dir}" pattern "${p.pattern}" has invalid mode "${p.mode}"`);
          }
        }
      }
    }
  }

  if (config.timeout !== undefined && (config.timeout < 1000 || config.timeout > 300_000)) {
    warnings.push(`timeout ${config.timeout}ms is outside recommended range (1000-300000ms)`);
  }

  if (config.hmr?.batchDelay !== undefined && config.hmr.batchDelay < 0) {
    errors.push("hmr.batchDelay must be >= 0");
  }

  if (config.hmr?.maxCascadeDepth !== undefined) {
    if (config.hmr.maxCascadeDepth < 1) errors.push("hmr.maxCascadeDepth must be >= 1");
    if (config.hmr.maxCascadeDepth > 100) warnings.push("hmr.maxCascadeDepth > 100 may impact performance");
  }

  const seenDirs = new Set<string>();
  for (const s of config.sources ?? []) {
    if (seenDirs.has(s.dir)) {
      warnings.push(`duplicate source dir "${s.dir}" — only the first entry is used`);
    }
    seenDirs.add(s.dir);
  }

  return { errors, warnings };
}

function detectOldConfig(obj: Record<string, unknown>): string | null {
  for (const key of V1_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return [
        `This config uses the denoburner v1 format (detected key: "${key}").`,
        "In v2, 'watch', 'serversDir', 'ignore', 'ignoreInitial', and 'outDir' have been removed.",
        "Replace them with the 'sources' field:",
        "",
        "  export default defineConfig({",
        "    sources: [",
        "      { dir: \"src\" },",
        "    ],",
        "  });",
        "",
        "See UPGRADE-v2.md for the full migration guide.",
      ].join("\n");
    }
  }
  return null;
}

function mergeConfig(base: DenoburnerConfig, override: Partial<DenoburnerConfig>): DenoburnerConfig {
  return {
    ...base,
    ...override,
    hmr: { ...base.hmr, ...override.hmr },
    bundle: { ...base.bundle, ...override.bundle },
  };
}


