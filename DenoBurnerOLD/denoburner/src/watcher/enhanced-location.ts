/**
 * Enhanced Location Configuration
 * 
 * Provides more flexible location configuration options including:
 * - Templates with variable substitution
 * - Multiple output destinations
 * - Dynamic resolvers
 * - Server-aware defaults
 */

import type { BundleMode } from "../bundler/types.ts";

/**
 * Context provided to location resolvers
 */
export interface LocationContext {
  /** Source file path (relative to cwd) */
  file: string;
  /** Directory name of the file */
  dir: string;
  /** File name without extension */
  name: string;
  /** File extension (with dot) */
  ext: string;
  /** Server detected from path (if any) */
  server: string;
  /** Project root directory */
  rootDir: string;
  /** Servers directory */
  serversDir: string;
  /** Full path relative to servers dir (if in servers dir) */
  serverPath: string | null;
}

/**
 * Result of location resolution
 */
export interface LocationResult {
  /** Target filename in Bitburner */
  filename: string;
  /** Target server in Bitburner */
  server: string;
  /** Optional: Override transform setting */
  transform?: boolean;
  /** Optional: Override bundle mode */
  bundle?: BundleMode;
  /** Optional: Override transpile setting */
  transpile?: boolean;
}

/**
 * Single location configuration
 */
export interface SingleLocationConfig {
  /** Target server name */
  server?: string;
  /** Target filename (supports template variables) */
  filename?: string;
  /** Template string with variable substitution */
  template?: string;
  /** Override transform setting */
  transform?: boolean;
  /** Override bundle mode */
  bundle?: BundleMode;
  /** Override transpile setting */
  transpile?: boolean;
}

/**
 * Function-based location resolver
 */
export type LocationResolver = (ctx: LocationContext) => LocationResult[] | null | undefined;

/**
 * Enhanced location configuration
 * Supports multiple formats:
 * - string: Server name only
 * - SingleLocationConfig: Single destination with options
 * - LocationResolver: Dynamic resolution function
 * - Array of above: Multiple destinations
 */
export type EnhancedLocationConfig =
  | string
  | SingleLocationConfig
  | LocationResolver
  | EnhancedLocationConfig[];

/**
 * Parse file path into context components
 */
export function parseFileContext(
  file: string,
  rootDir: string,
  serversDir: string
): LocationContext {
  const normalized = file.replaceAll("\\", "/");
  
  // Extract extension
  const lastDot = normalized.lastIndexOf(".");
  const ext = lastDot !== -1 ? normalized.slice(lastDot) : "";
  
  // Extract name (without extension)
  const nameWithExt = normalized.split("/").pop() ?? "";
  const name = ext ? nameWithExt.slice(0, -ext.length) : nameWithExt;
  
  // Extract directory
  const lastSlash = normalized.lastIndexOf("/");
  const dir = lastSlash !== -1 ? normalized.slice(0, lastSlash) : "";
  
  // Detect server from path
  const serversIndex = normalized.indexOf("/servers/");
  let server = "home";
  let serverPath: string | null = null;
  
  if (serversIndex !== -1) {
    const afterServers = normalized.slice(serversIndex + "/servers/".length);
    const parts = afterServers.split("/");
    server = parts[0] || "home";
    serverPath = parts.slice(1).join("/") || null;
  }
  
  return {
    file: normalized,
    dir,
    name,
    ext,
    server,
    rootDir,
    serversDir,
    serverPath,
  };
}

/**
 * Substitute template variables in a string
 */
export function substituteTemplate(template: string, ctx: LocationContext): string {
  return template
    .replace(/{file}/g, ctx.file)
    .replace(/{dir}/g, ctx.dir)
    .replace(/{name}/g, ctx.name)
    .replace(/{ext}/g, ctx.ext)
    .replace(/{server}/g, ctx.server)
    .replace(/{rootDir}/g, ctx.rootDir)
    .replace(/{serversDir}/g, ctx.serversDir)
    .replace(/{serverPath}/g, ctx.serverPath ?? ctx.file);
}

/**
 * Resolve a single location config to a result
 */
function resolveSingleLocation(
  config: SingleLocationConfig | string,
  ctx: LocationContext
): LocationResult | null {
  // Handle string shorthand (server name only)
  if (typeof config === "string") {
    return {
      server: config,
      filename: ctx.serverPath ?? ctx.file,
    };
  }
  
  // Handle template
  if (config.template) {
    const filename = substituteTemplate(config.template, ctx);
    return {
      filename,
      server: config.server ?? ctx.server,
      transform: config.transform,
      bundle: config.bundle,
      transpile: config.transpile,
    };
  }
  
  // Handle explicit filename
  if (config.filename) {
    const filename = substituteTemplate(config.filename, ctx);
    return {
      filename,
      server: config.server ?? ctx.server,
      transform: config.transform,
      bundle: config.bundle,
      transpile: config.transpile,
    };
  }
  
  // Handle server-only config
  if (config.server) {
    return {
      server: config.server,
      filename: ctx.serverPath ?? ctx.file,
      transform: config.transform,
      bundle: config.bundle,
      transpile: config.transpile,
    };
  }
  
  // Default: use detected server and path
  return {
    server: ctx.server,
    filename: ctx.serverPath ?? ctx.file,
    transform: config.transform,
    bundle: config.bundle,
    transpile: config.transpile,
  };
}

/**
 * Resolve enhanced location config to an array of results
 */
export function resolveEnhancedLocation(
  config: EnhancedLocationConfig,
  ctx: LocationContext
): LocationResult[] {
  // Handle null/undefined
  if (!config) {
    return [{
      server: ctx.server,
      filename: ctx.serverPath ?? ctx.file,
    }];
  }
  
  // Handle function resolver
  if (typeof config === "function") {
    const result = (config as LocationResolver)(ctx);
    if (!result) return [];
    return result;
  }
  
  // Handle array
  if (Array.isArray(config)) {
    const results: LocationResult[] = [];
    for (const item of config) {
      const resolved = resolveEnhancedLocation(item, ctx);
      results.push(...resolved);
    }
    return results;
  }
  
  // Handle single config
  const result = resolveSingleLocation(config, ctx);
  return result ? [result] : [];
}

/**
 * Create a location resolver function from enhanced config
 * 
 * This creates a reusable resolver that can be called with just the file path.
 */
export function createLocationResolver(
  config: EnhancedLocationConfig,
  rootDir: string,
  serversDir: string
): (file: string) => LocationResult[] {
  return (file: string) => {
    const ctx = parseFileContext(file, rootDir, serversDir);
    return resolveEnhancedLocation(config, ctx);
  };
}

/**
 * Common location presets
 */
export const LocationPresets = {
  /**
   * Upload to home server, preserving directory structure
   */
  home: (): EnhancedLocationConfig => ({
    server: "home",
  }),
  
  /**
   * Upload to detected server, preserving path
   */
  autoServer: (): EnhancedLocationConfig => ({
    template: "{serverPath}",
  }),
  
  /**
   * Upload to multiple servers
   */
  multiServer: (servers: string[]): EnhancedLocationConfig => 
    servers.map(server => ({ server })),
  
  /**
   * Upload scripts to /scripts/ directory
   */
  scriptsDir: (server: string = "home"): EnhancedLocationConfig => ({
    server,
    template: "scripts/{name}.js",
  }),
  
  /**
   * Upload binaries to /bin/ directory
   */
  binDir: (server: string = "home"): EnhancedLocationConfig => ({
    server,
    template: "bin/{name}.js",
  }),
  
  /**
   * Dynamic: different paths based on file location
   */
  smart: (): EnhancedLocationConfig => (ctx: LocationContext) => {
    // If in a bin directory, upload to /bin/
    if (ctx.dir.includes("/bin/")) {
      return [{ server: ctx.server, filename: `bin/${ctx.name}.js` }];
    }
    // If in a lib directory, upload to /lib/
    if (ctx.dir.includes("/lib/")) {
      return [{ server: ctx.server, filename: `lib/${ctx.name}.js` }];
    }
    // Default: preserve structure
    return [{ server: ctx.server, filename: ctx.serverPath ?? ctx.file }];
  },
  
  /**
   * Development: upload to home with .dev suffix
   */
  dev: (): EnhancedLocationConfig => ({
    server: "home",
    template: "{name}.dev.js",
  }),
};

/**
 * Example configurations
 */
export const ExampleConfigs = {
  /**
   * Simple: all files to home
   */
  simple: {
    pattern: "src/servers/**/*.ts",
    location: "home",
  },
  
  /**
   * Template: preserve directory structure
   */
  template: {
    pattern: "src/servers/**/*.ts",
    location: {
      template: "{serverPath}",
    },
  },
  
  /**
   * Multiple outputs: copy to multiple servers
   */
  multi: {
    pattern: "src/servers/home/shared.ts",
    location: [
      { server: "home" },
      { server: "n00dles", filename: "shared.js" },
    ],
  },
  
  /**
   * Dynamic: based on file location
   */
  dynamic: {
    pattern: "src/servers/**/*.ts",
    location: LocationPresets.smart(),
  },
  
  /**
   * Override bundling per location
   */
  bundling: {
    pattern: "src/servers/**/*.ts",
    location: {
      server: "home",
      bundle: "all" as BundleMode,
    },
  },
};
