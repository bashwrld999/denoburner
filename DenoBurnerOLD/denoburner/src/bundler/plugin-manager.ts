/**
 * Bundler Plugin Interface
 * 
 * Defines the interface for bundler plugins that can transform code
 * at different stages of the bundling process.
 */

import type * as esbuild from "npm:esbuild";

/**
 * Plugin lifecycle hooks
 */
export interface BundlerPluginHooks {
  /**
   * Called before the build starts
   */
  beforeBuild?: (entryPoint: string) => void | Promise<void>;

  /**
   * Called after the build completes
   */
  afterBuild?: (result: esbuild.BuildResult, content: string) => void | Promise<void>;

  /**
   * Transform the output content
   */
  transformOutput?: (content: string, entryPoint: string) => string | Promise<string>;

  /**
   * Wrap the main function with custom code
   */
  wrapMain?: (mainCode: string) => string;
}

/**
 * Bundler plugin interface
 */
export interface BundlerPlugin {
  /** Unique plugin name */
  readonly name: string;

  /** Plugin priority (lower = runs first) */
  readonly priority?: number;

  /** esbuild plugin setup */
  setup?: (build: esbuild.PluginBuild) => void;

  /** Lifecycle hooks */
  hooks?: BundlerPluginHooks;
}

/**
 * Plugin manager for registering and managing bundler plugins
 */
export class PluginManager {
  private plugins: BundlerPlugin[] = [];

  /**
   * Register a plugin
   */
  register(plugin: BundlerPlugin): void {
    this.plugins.push(plugin);
    // Sort by priority (lower = runs first)
    this.plugins.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  }

  /**
   * Remove a plugin by name
   */
  remove(name: string): boolean {
    const index = this.plugins.findIndex((p) => p.name === name);
    if (index !== -1) {
      this.plugins.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): ReadonlyArray<BundlerPlugin> {
    return this.plugins;
  }

  /**
   * Get esbuild plugins for build
   */
  getEsbuildPlugins(): esbuild.Plugin[] {
    return this.plugins
      .filter((p) => p.setup)
      .map((p) => ({
        name: p.name,
        setup: p.setup!,
      }));
  }

  /**
   * Run beforeBuild hooks
   */
  async runBeforeBuild(entryPoint: string): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.hooks?.beforeBuild) {
        await plugin.hooks.beforeBuild(entryPoint);
      }
    }
  }

  /**
   * Run afterBuild hooks
   */
  async runAfterBuild(result: esbuild.BuildResult, content: string): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.hooks?.afterBuild) {
        await plugin.hooks.afterBuild(result, content);
      }
    }
  }

  /**
   * Transform output through all plugins
   */
  async transformOutput(content: string, entryPoint: string): Promise<string> {
    let result = content;
    for (const plugin of this.plugins) {
      if (plugin.hooks?.transformOutput) {
        result = await plugin.hooks.transformOutput(result, entryPoint);
      }
    }
    return result;
  }

  /**
   * Wrap main function through all plugins
   */
  wrapMain(mainCode: string): string {
    let result = mainCode;
    for (const plugin of this.plugins) {
      if (plugin.hooks?.wrapMain) {
        result = plugin.hooks.wrapMain(result);
      }
    }
    return result;
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins = [];
  }
}
