/**
 * YAML config loader
 */

import type { ConfigLoader } from "./index.ts";
import type { DenoBurnerUserConfig } from "../types.ts";

/**
 * Loader for YAML config files
 * 
 * Uses js-yaml library for parsing YAML content.
 */
export class YamlLoader implements ConfigLoader {
  extensions = [".yaml", ".yml"];
  
  async load(filepath: string): Promise<DenoBurnerUserConfig> {
    // Dynamic import of js-yaml
    const { load } = await import("npm:js-yaml");
    
    const content = await Deno.readTextFile(filepath);
    const config = load(content);
    
    return config as DenoBurnerUserConfig;
  }
}
