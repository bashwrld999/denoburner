/**
 * CLI argument config source
 * 
 * Loads config from command-line arguments.
 */

import type { ConfigSource } from "./index.ts";
import type { DenoBurnerUserConfig } from "../types.ts";

/**
 * CLI argument mapping
 */
const CLI_MAPPINGS: Record<string, keyof DenoBurnerUserConfig> = {
  "--port": "port",
  "-p": "port",
  "--timeout": "timeout",
  "-t": "timeout",
  "--out-dir": "outDir",
  "-o": "outDir",
};

/**
 * Boolean flags
 */
const BOOLEAN_FLAGS = new Set([
  "--source-map",
  "--no-source-map",
  "--minify",
  "--no-minify",
  "--ignore-initial",
]);

/**
 * Parse CLI arguments into config
 */
function parseArgs(args: string[]): DenoBurnerUserConfig {
  const config: DenoBurnerUserConfig = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Handle boolean flags
    if (arg === "--source-map") {
      config.sourceMap = true;
      continue;
    }
    if (arg === "--no-source-map") {
      config.sourceMap = false;
      continue;
    }
    if (arg === "--minify") {
      config.minify = true;
      continue;
    }
    if (arg === "--no-minify") {
      config.minify = false;
      continue;
    }
    if (arg === "--ignore-initial") {
      config.ignoreInitial = true;
      continue;
    }
    
    // Handle key-value args
    const configKey = CLI_MAPPINGS[arg];
    if (configKey) {
      const value = args[i + 1];
      if (value && !value.startsWith("-")) {
        // Parse the value
        if (configKey === "port" || configKey === "timeout") {
          const num = parseInt(value, 10);
          if (!isNaN(num)) {
            (config as Record<string, unknown>)[configKey] = num;
          }
        } else {
          (config as Record<string, unknown>)[configKey] = value;
        }
        i++; // Skip next arg
      }
    }
  }
  
  return config;
}

/**
 * CLI argument config source
 */
export class CliSource implements ConfigSource {
  name = "cli";
  priority = 100;
  private args: string[];
  
  constructor(args: string[] = Deno.args) {
    this.args = args;
  }
  
  async load(): Promise<DenoBurnerUserConfig> {
    return parseArgs(this.args);
  }
  
  isAvailable(): boolean {
    // Check if any relevant CLI arg is present
    return this.args.some((arg) => 
      CLI_MAPPINGS[arg] !== undefined || 
      BOOLEAN_FLAGS.has(arg),
    );
  }
}
