/**
 * Bundler
 * 
 * Main orchestrator for bundling files.
 * Combines strategy, processors, and plugin manager.
 */

import type { BundlerStrategy } from "./interfaces/bundler-strategy.ts";
import type { FileProcessor, BuildContext } from "./interfaces/file-processor.ts";
import type { BundlerOptions, BundleMode, ProcessedFile } from "./types.ts";
import { PluginManager } from "./plugin-manager.ts";
import { DependencyAnalyzer, createAnalyzer } from "../analyzer/index.ts";
import { ExternalStrategy } from "./strategies/external-strategy.ts";
import { AllStrategy } from "./strategies/all-strategy.ts";
import { NoneStrategy } from "./strategies/none-strategy.ts";
import { RawProcessor } from "./processors/raw-processor.ts";
import { BundleProcessor } from "./processors/bundle-processor.ts";
import { reactPlugin } from "./plugins/react.ts";
import { cssPlugin } from "./plugins/css.ts";
import { mainWrapperPlugin } from "./plugins/main-wrapper.ts";
import { textPlugin } from "./plugins/text.ts";

const DEFAULT_OPTIONS: BundlerOptions = {
  sourceMap: false,
  minify: false,
  target: "esnext",
};

/**
 * Bundler configuration
 */
export interface BundlerConfig {
  /** Bundler options */
  options?: Partial<BundlerOptions>;
  /** Custom strategy (defaults to ExternalStrategy) */
  strategy?: BundlerStrategy;
  /** Custom plugin manager */
  pluginManager?: PluginManager;
  /** Custom analyzer */
  analyzer?: DependencyAnalyzer;
  /** Custom processors */
  processors?: FileProcessor[];
}

/**
 * Bundler
 * 
 * Main orchestrator for processing and bundling files.
 * 
 * @example
 * ```ts
 * const bundler = new Bundler({ sourceMap: true });
 * const result = await bundler.processFile('src/test.ts', 'external', 'home');
 * ```
 */
export class Bundler {
  private readonly options: BundlerOptions;
  private readonly strategy: BundlerStrategy;
  private readonly pluginManager: PluginManager;
  private readonly analyzer: DependencyAnalyzer;
  private readonly processors: FileProcessor[];

  constructor(config: BundlerConfig = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...config.options };
    
    // Use provided components or defaults
    this.strategy = config.strategy ?? new ExternalStrategy();
    this.pluginManager = config.pluginManager ?? this.createDefaultPluginManager();
    this.analyzer = config.analyzer ?? createAnalyzer();
    
    // Create processors
    this.processors = config.processors ?? [
      new RawProcessor(),
      new BundleProcessor({ strategy: this.strategy }),
    ];
  }

  /**
   * Get the plugin manager for external plugin registration
   */
  get plugins(): PluginManager {
    return this.pluginManager;
  }

  /**
   * Process a file based on its dependencies and bundle mode
   */
  async processFile(
    filePath: string,
    bundleMode: BundleMode,
    server: string,
    transpile: boolean = true,
  ): Promise<ProcessedFile> {
    // Build context
    const context: BuildContext = {
      options: this.options,
      server,
      bundleMode,
      transpile,
      pluginManager: this.pluginManager,
      analyzer: this.analyzer,
    };

    // Find appropriate processor
    const processor = this.processors.find((p) => p.canProcess(filePath, context));
    
    if (!processor) {
      throw new Error(`No processor found for file: ${filePath}`);
    }

    return processor.process(filePath, context);
  }

  /**
   * Create default plugin manager with standard plugins
   */
  private createDefaultPluginManager(): PluginManager {
    const manager = new PluginManager();

    // Register default plugins with priorities
    manager.register({
      name: "react",
      priority: 10,
      setup: reactPlugin().setup,
    });

    manager.register({
      name: "css",
      priority: 20,
      setup: cssPlugin().setup,
    });

    manager.register({
      name: "text",
      priority: 30,
      setup: textPlugin().setup,
    });

    // manager.register({
    //   name: "main-wrapper",
    //   priority: 30,
    //   setup: mainWrapperPlugin().setup,
    // });

    return manager;
  }
}

// Export types
export * from "./types.ts";

// Export interfaces
export type { BundlerStrategy } from "./interfaces/bundler-strategy.ts";
export type { FileProcessor, BuildContext } from "./interfaces/file-processor.ts";

// Export strategies
export { ExternalStrategy } from "./strategies/external-strategy.ts";
export { AllStrategy } from "./strategies/all-strategy.ts";
export { NoneStrategy } from "./strategies/none-strategy.ts";

// Export processors
export { RawProcessor } from "./processors/raw-processor.ts";
export { BundleProcessor } from "./processors/bundle-processor.ts";

// Export plugin manager
export { PluginManager } from "./plugin-manager.ts";
export type { BundlerPlugin, BundlerPluginHooks } from "./plugin-manager.ts";

// Factory functions

/**
 * Create a bundler with default settings
 */
export function createBundler(options: Partial<BundlerOptions> = {}): Bundler {
  return new Bundler({ options });
}

/**
 * Create a bundler with custom plugins
 */
export function createBundlerWithPlugins(
  options: Partial<BundlerOptions>,
  pluginManager: PluginManager,
): Bundler {
  return new Bundler({ options, pluginManager });
}

/**
 * Create a bundler with custom strategy
 */
export function createBundlerWithStrategy(
  options: Partial<BundlerOptions>,
  strategy: BundlerStrategy,
): Bundler {
  return new Bundler({ options, strategy });
}

/**
 * Create a fully custom bundler
 */
export function createCustomBundler(config: BundlerConfig): Bundler {
  return new Bundler(config);
}
