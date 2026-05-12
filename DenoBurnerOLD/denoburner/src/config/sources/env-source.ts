/**
 * Environment variable config source
 * 
 * Loads config from DENOBURNER_* environment variables.
 */

import type { ConfigSource } from "./index.ts";
import type { DenoBurnerUserConfig } from "../types.ts";

/**
 * Mapping of environment variables to config keys
 */
const ENV_MAPPINGS: Record<string, keyof DenoBurnerUserConfig> = {
  DENOBURNER_PORT: "port",
  DENOBURNER_TIMEOUT: "timeout",
  DENOBURNER_SOURCE_MAP: "sourceMap",
  DENOBURNER_MINIFY: "minify",
  DENOBURNER_OUT_DIR: "outDir",
  DENOBURNER_IGNORE_INITIAL: "ignoreInitial",
};

/**
 * Parse a string value to the appropriate type
 */
function parseValue(value: string, key: keyof DenoBurnerUserConfig): unknown {
  // Boolean parsing
  if (key === "sourceMap" || key === "minify" || key === "ignoreInitial") {
    return value === "true" || value === "1";
  }
  
  // Number parsing
  if (key === "port" || key === "timeout") {
    const num = parseInt(value, 10);
    return isNaN(num) ? value : num;
  }
  
  // String values
  return value;
}

/**
 * Environment variable config source
 */
export class EnvSource implements ConfigSource {
  name = "environment";
  priority = 50;
  
  async load(): Promise<DenoBurnerUserConfig> {
    const config: DenoBurnerUserConfig = {};
    
    for (const [envKey, configKey] of Object.entries(ENV_MAPPINGS)) {
      const value = Deno.env.get(envKey);
      
      if (value !== undefined) {
        (config as Record<string, unknown>)[configKey] = parseValue(value, configKey);
      }
    }
    
    return config;
  }
  
  isAvailable(): boolean {
    // Check if any DENOBURNER_* env var is set
    for (const envKey of Object.keys(ENV_MAPPINGS)) {
      if (Deno.env.get(envKey) !== undefined) {
        return true;
      }
    }
    return false;
  }
}
