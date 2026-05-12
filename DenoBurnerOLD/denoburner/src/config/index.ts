/**
 * Configuration module
 * 
 * Handles loading and resolving denoburner configuration.
 * 
 * Features:
 * - Multiple file formats (TS, JS, JSON, YAML)
 * - Config inheritance via extends
 * - Environment variable overrides
 * - CLI argument overrides
 * - Async config values
 * - Plugin config registry
 * - Schema validation
 * - Migration system
 */

import type { DenoBurnerConfig, DenoBurnerUserConfig, ResolvedDenoBurnerConfig } from "./types.ts";
import { resolveConfig } from "./resolve.ts";
import { validateConfig, formatValidationErrors } from "./validation.ts";
import { findConfigFile, loadConfigFile, LoaderRegistry } from "./loader/index.ts";
import { resolveInheritance } from "./inheritance.ts";
import { SourceChain } from "./sources/index.ts";
import { deepResolveAsync } from "./async.ts";
import { migrateConfig } from "./migration.ts";

// Re-export types
export * from "./types.ts";

// Re-export validation
export { validateConfig, formatValidationErrors } from "./validation.ts";
export type { ValidationError, ValidationResult } from "./validation.ts";

// Re-export loader
export { LoaderRegistry, findConfigFile, loadConfigFile } from "./loader/index.ts";
export type { ConfigLoader } from "./loader/index.ts";

// Re-export sources
export { SourceChain, deepMerge } from "./sources/index.ts";
export type { ConfigSource } from "./sources/index.ts";

// Re-export async utilities
export { resolveAsyncValue, deepResolveAsync } from "./async.ts";

// Re-export inheritance
export { resolveInheritance, getInheritanceChain } from "./inheritance.ts";

// Re-export builder
export { ConfigBuilder, createConfig } from "./builder.ts";
export type { WatchItemOptions } from "./builder.ts";

// Re-export watcher
export { ConfigWatcher } from "./watcher.ts";
export type { ConfigWatcherEventMap } from "./watcher.ts";

// Re-export plugin registry
export { PluginConfigRegistry, pluginConfigRegistry, definePluginConfig } from "./plugins/index.ts";
export type { PluginConfigDefinition, ConfigSchema } from "./plugins/index.ts";

// Re-export diagnostics
export { getDiagnostics, formatDiagnostics, printDiagnostics, validateAndPrint } from "./diagnostics.ts";
export type { ConfigDiagnostics } from "./diagnostics.ts";

// Re-export migration
export { MigrationManager, migrationManager, migrateConfig } from "./migration.ts";
export type { ConfigMigration } from "./migration.ts";

// Re-export resolve
export { resolveConfig } from "./resolve.ts";

// Re-export schema
export { configSchema, getSchemaUrl, getSchemaProperty, generateSampleConfig } from "./schema.ts";

/**
 * Define configuration with type checking
 */
export function defineConfig(config: DenoBurnerUserConfig): DenoBurnerUserConfig {
  return config;
}

/**
 * Load configuration from file with full resolution pipeline
 * 
 * Resolution order:
 * 1. Load config file (TS, JS, JSON, or YAML)
 * 2. Resolve inheritance (extends)
 * 3. Apply migrations (if version specified)
 * 4. Merge with environment variables
 * 5. Merge with CLI arguments
 * 6. Resolve async values
 * 7. Validate
 * 8. Apply defaults
 */
export async function loadConfig(root = Deno.cwd()): Promise<ResolvedDenoBurnerConfig> {
  const registry = new LoaderRegistry();
  
  // Step 1: Find and load config file
  const filepath = await findConfigFile(root);
  
  let fileConfig: DenoBurnerUserConfig = {};
  if (filepath) {
    fileConfig = await loadConfigFile(filepath, registry);
  } else {
    console.warn("No config file found, using defaults.");
  }
  
  // Step 2: Resolve inheritance
  const inheritedConfig = await resolveInheritance(fileConfig, { root, registry });
  
  // Step 3: Apply migrations if version specified
  let migratedConfig = inheritedConfig;
  if (inheritedConfig.version) {
    migratedConfig = migrateConfig(inheritedConfig, inheritedConfig.version) as DenoBurnerUserConfig;
  }
  
  // Step 4-5: Load from sources and merge
  const sourceChain = new SourceChain();
  const { config: sourceConfig } = await sourceChain.load();
  
  const mergedConfig: DenoBurnerUserConfig = {
    ...migratedConfig,
    ...sourceConfig,
  };
  
  // Step 6: Resolve async values
  const asyncResolvedConfig = await deepResolveAsync(mergedConfig);
  
  // Step 7: Validate
  const validation = validateConfig(asyncResolvedConfig);
  if (!validation.success) {
    console.error(formatValidationErrors(validation.errors));
    throw new Error("Configuration validation failed");
  }
  
  // Step 8: Apply defaults and resolve
  return resolveConfig(validation.data as DenoBurnerConfig);
}

/**
 * Load configuration with diagnostics info
 */
export async function loadConfigWithDiagnostics(
  root = Deno.cwd(),
): Promise<{
  config: ResolvedDenoBurnerConfig;
  diagnostics: import("./diagnostics.ts").ConfigDiagnostics;
}> {
  const { getDiagnostics } = await import("./diagnostics.ts");
  const diagnostics = await getDiagnostics(root);
  
  if (!diagnostics.validation.success) {
    throw new Error("Configuration validation failed");
  }
  
  const config = resolveConfig(diagnostics.validation.data as DenoBurnerConfig);
  
  return { config, diagnostics };
}
