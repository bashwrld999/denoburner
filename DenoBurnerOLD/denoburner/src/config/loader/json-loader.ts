/**
 * JSON config loader
 */

import type { ConfigLoader } from "./index.ts";
import type { DenoBurnerUserConfig } from "../types.ts";

/**
 * Loader for JSON config files
 */
export class JsonLoader implements ConfigLoader {
  extensions = [".json"];
  
  async load(filepath: string): Promise<DenoBurnerUserConfig> {
    const content = await Deno.readTextFile(filepath);
    const config = JSON.parse(content);
    
    return config as DenoBurnerUserConfig;
  }
}
