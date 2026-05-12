/**
 * Config loader module
 * 
 * Implements the Strategy pattern for loading different config file formats.
 */

import { resolve, extname } from "jsr:@std/path";
import type { DenoBurnerUserConfig } from "../types.ts";
import { TypeScriptLoader } from "./ts-loader.ts";
import { JsonLoader } from "./json-loader.ts";
import { YamlLoader } from "./yaml-loader.ts";

/**
 * Config loader interface (Strategy pattern)
 */
export interface ConfigLoader {
  /** Supported file extensions */
  extensions: string[];
  /** Load config from file */
  load(path: string): Promise<DenoBurnerUserConfig>;
}

/**
 * Loader registry - manages all available loaders
 */
export class LoaderRegistry {
  private loaders: ConfigLoader[] = [];
  
  constructor() {
    // Register default loaders
    this.register(new TypeScriptLoader());
    this.register(new JsonLoader());
    this.register(new YamlLoader());
  }
  
  /**
   * Register a new loader
   */
  register(loader: ConfigLoader): void {
    this.loaders.push(loader);
  }
  
  /**
   * Get loader for a file extension
   */
  getLoader(extension: string): ConfigLoader | undefined {
    const ext = extension.startsWith(".") ? extension : `.${extension}`;
    return this.loaders.find((l) => l.extensions.includes(ext));
  }
  
  /**
   * Get all supported extensions
   */
  getSupportedExtensions(): string[] {
    return this.loaders.flatMap((l) => l.extensions);
  }
  
  /**
   * Check if a file extension is supported
   */
  isSupported(extension: string): boolean {
    return this.getLoader(extension) !== undefined;
  }
}

/**
 * Default config file names to search for
 */
const CONFIG_FILE_NAMES = [
  "denoburner.ts",
  "denoburner.mts",
  "denoburner.js",
  "denoburner.mjs",
  "denoburner.json",
  "denoburner.yaml",
  "denoburner.yml",
];

/**
 * Find config file in directory
 */
export async function findConfigFile(
  root: string,
  fileNames: string[] = CONFIG_FILE_NAMES,
): Promise<string | null> {
  for (const filename of fileNames) {
    const filepath = resolve(root, filename);
    try {
      await Deno.stat(filepath);
      return filepath;
    } catch {
      // File doesn't exist, try next
      continue;
    }
  }
  return null;
}

/**
 * Load config from a specific file
 */
export async function loadConfigFile(
  filepath: string,
  registry: LoaderRegistry = new LoaderRegistry(),
): Promise<DenoBurnerUserConfig> {
  const ext = extname(filepath);
  const loader = registry.getLoader(ext);
  
  if (!loader) {
    throw new Error(
      `No loader for extension "${ext}". Supported: ${registry.getSupportedExtensions().join(", ")}`,
    );
  }
  
  return loader.load(filepath);
}

/**
 * Load config from directory (searches for config file)
 */
export async function loadConfigFromDirectory(
  root: string,
  registry: LoaderRegistry = new LoaderRegistry(),
): Promise<{ config: DenoBurnerUserConfig; filepath: string | null }> {
  const filepath = await findConfigFile(root);
  
  if (!filepath) {
    return { config: {}, filepath: null };
  }
  
  const config = await loadConfigFile(filepath, registry);
  return { config, filepath };
}

// Re-export individual loaders
export { TypeScriptLoader } from "./ts-loader.ts";
export { JsonLoader } from "./json-loader.ts";
export { YamlLoader } from "./yaml-loader.ts";
