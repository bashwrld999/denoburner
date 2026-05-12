/**
 * Config inheritance support
 * 
 * Allows configs to extend from base configs using the `extends` field.
 */

import { resolve, dirname } from "jsr:@std/path";
import type { DenoBurnerUserConfig } from "./types.ts";
import { loadConfigFile, LoaderRegistry } from "./loader/index.ts";
import { deepMerge } from "./sources/index.ts";

/**
 * Load context for inheritance resolution
 */
export interface InheritanceContext {
  /** Root directory for resolving relative paths */
  root: string;
  /** Loader registry for loading config files */
  registry: LoaderRegistry;
  /** Set of already loaded files (to detect circular inheritance) */
  loaded: Set<string>;
  /** Maximum inheritance depth */
  maxDepth: number;
}

/**
 * Default inheritance context
 */
function createDefaultContext(root: string): InheritanceContext {
  return {
    root,
    registry: new LoaderRegistry(),
    loaded: new Set(),
    maxDepth: 10,
  };
}

/**
 * Resolve config inheritance
 * 
 * Loads base configs and merges them with the current config.
 * Base configs are loaded first, then merged with the current config.
 */
export async function resolveInheritance(
  config: DenoBurnerUserConfig,
  context?: Partial<InheritanceContext>,
): Promise<DenoBurnerUserConfig> {
  // No extends field - return as-is
  if (!config.extends) {
    return config;
  }
  
  const ctx: InheritanceContext = {
    ...createDefaultContext(context?.root ?? Deno.cwd()),
    ...context,
  };
  
  // Normalize extends to array
  const extendsList = Array.isArray(config.extends) 
    ? config.extends 
    : [config.extends];
  
  // Load and merge base configs
  let merged: DenoBurnerUserConfig = {};
  
  for (const extendPath of extendsList) {
    const resolved = await loadBaseConfig(extendPath, ctx);
    merged = deepMerge(merged as unknown as Record<string, unknown>, resolved as unknown as Record<string, unknown>) as DenoBurnerUserConfig;
  }
  
  // Merge current config on top (current config takes precedence)
  const result = deepMerge(merged as unknown as Record<string, unknown>, config as unknown as Record<string, unknown>) as DenoBurnerUserConfig;
  
  // Remove the extends field from the result
  delete result.extends;
  
  return result;
}

/**
 * Load a base config file
 */
async function loadBaseConfig(
  path: string,
  context: InheritanceContext,
): Promise<DenoBurnerUserConfig> {
  // Resolve relative path
  const resolvedPath = resolve(context.root, path);
  
  // Check for circular inheritance
  if (context.loaded.has(resolvedPath)) {
    throw new Error(
      `Circular config inheritance detected: ${resolvedPath} is already being loaded`,
    );
  }
  
  // Check depth limit
  if (context.loaded.size >= context.maxDepth) {
    throw new Error(
      `Maximum inheritance depth (${context.maxDepth}) exceeded`,
    );
  }
  
  // Mark as loaded
  context.loaded.add(resolvedPath);
  
  // Load the config file
  const baseConfig = await loadConfigFile(resolvedPath, context.registry);
  
  // Update context root for nested inheritance
  const nestedContext: InheritanceContext = {
    ...context,
    root: dirname(resolvedPath),
  };
  
  // Recursively resolve inheritance in the base config
  return resolveInheritance(baseConfig, nestedContext);
}

/**
 * Get all config files in the inheritance chain
 */
export async function getInheritanceChain(
  config: DenoBurnerUserConfig,
  context?: Partial<InheritanceContext>,
): Promise<string[]> {
  if (!config.extends) {
    return [];
  }
  
  const ctx: InheritanceContext = {
    ...createDefaultContext(context?.root ?? Deno.cwd()),
    ...context,
  };
  
  const extendsList = Array.isArray(config.extends) 
    ? config.extends 
    : [config.extends];
  
  const chain: string[] = [];
  
  for (const extendPath of extendsList) {
    const resolvedPath = resolve(ctx.root, extendPath);
    chain.push(resolvedPath);
    
    // Load and get nested chain
    const baseConfig = await loadConfigFile(resolvedPath, ctx.registry);
    const nestedChain = await getInheritanceChain(baseConfig, {
      ...ctx,
      root: dirname(resolvedPath),
    });
    chain.push(...nestedChain);
  }
  
  return chain;
}
