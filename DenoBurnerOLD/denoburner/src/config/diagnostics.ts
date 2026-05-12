/**
 * Config diagnostics module
 * 
 * Provides tools for inspecting and debugging configuration.
 */

import type { DenoBurnerUserConfig, ResolvedDenoBurnerConfig } from "./types.ts";
import type { ValidationResult } from "./validation.ts";
import { validateConfig, formatValidationErrors } from "./validation.ts";
import { findConfigFile, loadConfigFile, LoaderRegistry } from "./loader/index.ts";
import { resolveInheritance, getInheritanceChain } from "./inheritance.ts";
import { SourceChain } from "./sources/index.ts";
import { deepResolveAsync } from "./async.ts";

/**
 * Config diagnostics result
 */
export interface ConfigDiagnostics {
  /** Config file path (null if not found) */
  configFile: string | null;
  /** Raw config from file */
  rawConfig: DenoBurnerUserConfig;
  /** Config after inheritance resolution */
  resolvedInheritance: DenoBurnerUserConfig;
  /** Config after source chain merge */
  mergedConfig: DenoBurnerUserConfig;
  /** Config after async resolution */
  asyncResolvedConfig: DenoBurnerUserConfig;
  /** Final resolved config */
  resolvedConfig: ResolvedDenoBurnerConfig | null;
  /** Validation result */
  validation: ValidationResult<DenoBurnerUserConfig>;
  /** Inheritance chain */
  inheritanceChain: string[];
  /** Source contributions */
  sources: Map<string, DenoBurnerUserConfig>;
  /** Errors encountered */
  errors: Array<{ stage: string; error: Error }>;
}

/**
 * Get comprehensive config diagnostics
 */
export async function getDiagnostics(
  root: string = Deno.cwd(),
): Promise<ConfigDiagnostics> {
  const errors: Array<{ stage: string; error: Error }> = [];
  const registry = new LoaderRegistry();
  
  // Find config file
  const configFile = await findConfigFile(root);
  
  // Load raw config
  let rawConfig: DenoBurnerUserConfig = {};
  if (configFile) {
    try {
      rawConfig = await loadConfigFile(configFile, registry);
    } catch (error) {
      errors.push({
        stage: "load",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
  
  // Resolve inheritance
  let resolvedInheritance: DenoBurnerUserConfig = {};
  let inheritanceChain: string[] = [];
  try {
    resolvedInheritance = await resolveInheritance(rawConfig, { root, registry });
    inheritanceChain = await getInheritanceChain(rawConfig, { root, registry });
  } catch (error) {
    errors.push({
      stage: "inheritance",
      error: error instanceof Error ? error : new Error(String(error)),
    });
    resolvedInheritance = rawConfig;
  }
  
  // Load from sources
  let mergedConfig: DenoBurnerUserConfig = {};
  let sources = new Map<string, DenoBurnerUserConfig>();
  try {
    const sourceChain = new SourceChain();
    const sourceResult = await sourceChain.load();
    mergedConfig = sourceResult.config;
    sources = sourceResult.sources;
  } catch (error) {
    errors.push({
      stage: "sources",
      error: error instanceof Error ? error : new Error(String(error)),
    });
  }
  
  // Merge file config with source config
  const combinedConfig: DenoBurnerUserConfig = {
    ...resolvedInheritance,
    ...mergedConfig,
  };
  
  // Resolve async values
  let asyncResolvedConfig: DenoBurnerUserConfig = {};
  try {
    asyncResolvedConfig = await deepResolveAsync(combinedConfig);
  } catch (error) {
    errors.push({
      stage: "async",
      error: error instanceof Error ? error : new Error(String(error)),
    });
    asyncResolvedConfig = combinedConfig;
  }
  
  // Validate
  const validation = validateConfig(asyncResolvedConfig);
  
  return {
    configFile,
    rawConfig,
    resolvedInheritance,
    mergedConfig,
    asyncResolvedConfig,
    resolvedConfig: null, // Will be set after full resolution
    validation,
    inheritanceChain,
    sources,
    errors,
  };
}

/**
 * Format diagnostics for display
 */
export function formatDiagnostics(diagnostics: ConfigDiagnostics): string {
  const lines: string[] = [];
  
  // Config file
  lines.push("=== Configuration Diagnostics ===\n");
  lines.push(`Config file: ${diagnostics.configFile ?? "Not found"}`);
  
  // Inheritance chain
  if (diagnostics.inheritanceChain.length > 0) {
    lines.push("\nInheritance chain:");
    for (const path of diagnostics.inheritanceChain) {
      lines.push(`  → ${path}`);
    }
  }
  
  // Sources
  if (diagnostics.sources.size > 0) {
    lines.push("\nConfig sources:");
    for (const [name, config] of diagnostics.sources) {
      const keys = Object.keys(config);
      lines.push(`  ${name}: ${keys.length > 0 ? keys.join(", ") : "(empty)"}`);
    }
  }
  
  // Validation
  lines.push("\nValidation:");
  if (diagnostics.validation.success) {
    lines.push("  ✓ Configuration is valid");
  } else {
    lines.push("  ✗ Configuration has errors:");
    lines.push(formatValidationErrors(diagnostics.validation.errors));
  }
  
  // Errors
  if (diagnostics.errors.length > 0) {
    lines.push("\nErrors encountered:");
    for (const { stage, error } of diagnostics.errors) {
      lines.push(`  [${stage}] ${error.message}`);
    }
  }
  
  // Raw config
  lines.push("\n--- Raw Config ---");
  lines.push(JSON.stringify(diagnostics.rawConfig, null, 2));
  
  // Final config
  lines.push("\n--- Final Config ---");
  lines.push(JSON.stringify(diagnostics.asyncResolvedConfig, null, 2));
  
  return lines.join("\n");
}

/**
 * Print diagnostics to console
 */
export async function printDiagnostics(root?: string): Promise<void> {
  const diagnostics = await getDiagnostics(root);
  console.log(formatDiagnostics(diagnostics));
}

/**
 * Validate config and print result
 */
export async function validateAndPrint(root?: string): Promise<boolean> {
  const diagnostics = await getDiagnostics(root);
  
  if (diagnostics.validation.success) {
    console.log("✓ Configuration is valid");
    return true;
  } else {
    console.error(formatValidationErrors(diagnostics.validation.errors));
    return false;
  }
}
