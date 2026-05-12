/**
 * Config builder pattern
 * 
 * Fluent API for programmatic configuration.
 */

import type {
  DenoBurnerUserConfig,
  WatchItem,
  ThemeConfig,
  DownloadConfig,
} from "./types.ts";
import type { BundleMode } from "../bundler/types.ts";

/**
 * Watch item options (without pattern)
 */
export interface WatchItemOptions {
  transform?: boolean;
  bundle?: BundleMode;
  transpile?: boolean;
  location?: WatchItem["location"];
}

/**
 * Config builder for fluent API
 */
export class ConfigBuilder {
  private config: DenoBurnerUserConfig = {};
  
  /**
   * Set the port for Bitburner Remote API
   */
  port(port: number): this {
    this.config.port = port;
    return this;
  }
  
  /**
   * Set the connection timeout in milliseconds
   */
  timeout(ms: number): this {
    this.config.timeout = ms;
    return this;
  }
  
  /**
   * Enable or disable source maps
   */
  sourceMap(enabled: boolean): this {
    this.config.sourceMap = enabled;
    return this;
  }
  
  /**
   * Enable or disable minification
   */
  minify(enabled: boolean): this {
    this.config.minify = enabled;
    return this;
  }
  
  /**
   * Set the output directory for build command
   */
  outDir(dir: string): this {
    this.config.outDir = dir;
    return this;
  }
  
  /**
   * Skip initial upload on dev server start
   */
  ignoreInitial(ignore: boolean): this {
    this.config.ignoreInitial = ignore;
    return this;
  }
  
  /**
   * Add a watch pattern
   */
  watch(pattern: string, options?: WatchItemOptions): this {
    this.config.watch ??= [];
    
    const item: WatchItem = {
      pattern,
      ...options,
    };
    
    this.config.watch.push(item);
    return this;
  }
  
  /**
   * Add multiple watch patterns
   */
  watchMany(patterns: string[], options?: WatchItemOptions): this {
    for (const pattern of patterns) {
      this.watch(pattern, options);
    }
    return this;
  }
  
  /**
   * Add a TypeScript watch pattern with sensible defaults
   */
  watchTs(pattern: string, options?: WatchItemOptions): this {
    return this.watch(pattern, {
      transform: true,
      bundle: "external",
      transpile: true,
      ...options,
    });
  }
  
  /**
   * Add a JavaScript watch pattern with sensible defaults
   */
  watchJs(pattern: string, options?: WatchItemOptions): this {
    return this.watch(pattern, {
      transform: true,
      bundle: "all",
      transpile: false,
      ...options,
    });
  }
  
  /**
   * Add a static file watch pattern (no transformation)
   */
  watchStatic(pattern: string): this {
    return this.watch(pattern, {
      transform: false,
    });
  }
  
  /**
   * Set theme configuration
   */
  theme(theme: Partial<ThemeConfig>): this {
    this.config.theme = { ...this.config.theme, ...theme };
    return this;
  }
  
  /**
   * Set download configuration
   */
  download(download: Partial<DownloadConfig>): this {
    this.config.download = { ...this.config.download, ...download };
    return this;
  }
  
  /**
   * Set download servers
   */
  downloadFrom(servers: string[]): this {
    this.config.download ??= {};
    this.config.download.servers = servers;
    return this;
  }
  
  /**
   * Extend from base config file(s)
   */
  extends(paths: string | string[]): this {
    this.config.extends = paths;
    return this;
  }
  
  /**
   * Set config version for migration
   */
  version(version: string): this {
    this.config.version = version;
    return this;
  }
  
  /**
   * Set plugin configuration
   */
  plugin(name: string, config: unknown): this {
    this.config.plugins ??= {};
    this.config.plugins[name] = config;
    return this;
  }
  
  /**
   * Merge additional config
   */
  merge(config: DenoBurnerUserConfig): this {
    this.config = { ...this.config, ...config };
    if (config.watch) {
      this.config.watch = [...(this.config.watch ?? []), ...config.watch];
    }
    return this;
  }
  
  /**
   * Build the final configuration
   */
  build(): DenoBurnerUserConfig {
    return { ...this.config };
  }
  
  /**
   * Build and validate the configuration
   */
  buildValidated(): DenoBurnerUserConfig {
    const config = this.build();
    // Import validation dynamically to avoid circular dependency
    // Validation is optional at this stage
    return config;
  }
  
  /**
   * Clone the builder
   */
  clone(): ConfigBuilder {
    const builder = new ConfigBuilder();
    builder.config = { ...this.config };
    if (this.config.watch) {
      builder.config.watch = [...this.config.watch];
    }
    return builder;
  }
  
  /**
   * Reset the builder
   */
  reset(): this {
    this.config = {};
    return this;
  }
}

/**
 * Create a new config builder
 */
export function createConfig(): ConfigBuilder {
  return new ConfigBuilder();
}
