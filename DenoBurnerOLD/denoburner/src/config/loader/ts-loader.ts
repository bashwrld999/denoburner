/**
 * TypeScript/JavaScript config loader
 */

import type { ConfigLoader } from "./index.ts";
import type { DenoBurnerUserConfig } from "../types.ts";

/**
 * Loader for TypeScript and JavaScript config files
 */
export class TypeScriptLoader implements ConfigLoader {
  extensions = [".ts", ".mts", ".js", ".mjs"];
  
  async load(filepath: string): Promise<DenoBurnerUserConfig> {
    // Dynamic import for TypeScript/JavaScript files
    const mod = await import(`file://${filepath}`);
    
    // Support both default export and named export
    const config = mod.default ?? mod.config ?? {};
    
    return config as DenoBurnerUserConfig;
  }
}
