import type { DenoburnerConfig } from "./types.ts";
import { DEFAULT_CONFIG } from "./types.ts";

export function defineConfig(config: Partial<DenoburnerConfig>): DenoburnerConfig {
  return mergeConfig(DEFAULT_CONFIG, config);
}

export async function loadConfig(configPath?: string): Promise<DenoburnerConfig> {
  if (configPath) {
    try {
      const mod = await import(resolveConfigPath(configPath));
      const exported = mod.default || mod.config;
      if (!exported) {
        throw new Error(`Config at ${configPath} must have a default export`);
      }
      return mergeConfig(DEFAULT_CONFIG, exported);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Config at")) throw err;
      throw new Error(`Failed to load config from ${configPath}: ${err instanceof Error ? err.message : err}`);
    }
  }

  const autoPaths = [
    "./denoburner.config.ts",
    "./denoburner.config.js",
    "./denoburner/config.ts",
  ];
  const loadErrors: string[] = [];

  for (const p of autoPaths) {
    try {
      const mod = await import(p);
      const exported = mod.default || mod.config;
      if (exported) {
        return mergeConfig(DEFAULT_CONFIG, exported);
      }
      loadErrors.push(`${p}: no default export`);
    } catch (err) {
      loadErrors.push(`${p}: ${err instanceof Error ? err.message : err}`);
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

  if (!config.watch || config.watch.length === 0) {
    errors.push("at least one watch entry is required");
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

  const validModes = new Set(["passthrough", "transpile", "bundle"]);
  for (const w of config.watch) {
    if (!w.pattern) errors.push("watch entry missing pattern");
    if (!validModes.has(w.mode)) {
      errors.push(`watch entry "${w.pattern}" has invalid mode "${w.mode}"`);
    }
    if (w.server !== undefined && typeof w.server !== "string") {
      errors.push(`watch entry "${w.pattern}" server must be a string`);
    }
  }

  if (config.ignore) {
    for (const pattern of config.ignore) {
      try {
        new RegExp(pattern);
      } catch {
        warnings.push(`ignore pattern "${pattern}" is not a valid regex`);
      }
    }
  }

  const seenPatterns = new Map<string, string>();
  for (const w of config.watch) {
    const existing = seenPatterns.get(w.pattern);
    if (existing && existing !== w.mode) {
      warnings.push(`watch entry "${w.pattern}" has conflicting modes: "${existing}" and "${w.mode}"`);
    }
    seenPatterns.set(w.pattern, w.mode);
  }

  return { errors, warnings };
}

function mergeConfig(base: DenoburnerConfig, override: Partial<DenoburnerConfig>): DenoburnerConfig {
  return {
    ...base,
    ...override,
    watch: override.watch ?? base.watch,
    ignore: override.ignore ?? base.ignore,
  };
}

function resolveConfigPath(path: string): string {
  if (path.startsWith("./") || path.startsWith("../") || path.startsWith("/")) {
    return path;
  }
  return `./${path}`;
}
