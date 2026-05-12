/**
 * Bundler Module
 * 
 * Bundles TypeScript/JavaScript files using esbuild with Deno plugins.
 * 
 * Architecture:
 * - Strategy: Strategy pattern for bundling modes (external, all, none)
 * - Processor: Strategy pattern for file processing (raw, bundle)
 * - PluginManager: Manages esbuild plugins with lifecycle hooks
 * 
 * Usage:
 * ```typescript
 * import { createBundler } from './bundler';
 * 
 * const bundler = createBundler({ sourceMap: true });
 * const result = await bundler.processFile('src/servers/home/test.ts', 'external', 'home');
 * ```
 */

// Main bundler
export { 
  Bundler,
  createBundler,
  createBundlerWithPlugins,
  createBundlerWithStrategy,
  createCustomBundler,
} from "./bundler.ts";
export type { BundlerConfig } from "./bundler.ts";

// Types
export type {
  BundleMode,
  BundlerOptions,
  BundledFile,
  ProcessedFile,
} from "./types.ts";

// Interfaces
export type { BundlerStrategy } from "./interfaces/bundler-strategy.ts";
export type { FileProcessor, BuildContext } from "./interfaces/file-processor.ts";

// Strategies
export { ExternalStrategy } from "./strategies/external-strategy.ts";
export { AllStrategy } from "./strategies/all-strategy.ts";
export { NoneStrategy } from "./strategies/none-strategy.ts";

// Processors
export { RawProcessor } from "./processors/raw-processor.ts";
export { BundleProcessor } from "./processors/bundle-processor.ts";
export type { BundleProcessorOptions } from "./processors/bundle-processor.ts";

// Plugin Manager
export { PluginManager } from "./plugin-manager.ts";
export type { BundlerPlugin, BundlerPluginHooks } from "./plugin-manager.ts";
