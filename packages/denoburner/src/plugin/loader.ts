import { resolve, dirname } from "@std/path";
import type { DenoburnerPlugin } from "./types.ts";
import type { ILogger } from "../logger/interfaces.ts";
import { toDenoburnerError } from "../core/errors.ts";

export async function loadPlugins(
  pluginPaths: string[],
  configDir: string,
  logger: ILogger,
): Promise<DenoburnerPlugin[]> {
  const plugins: DenoburnerPlugin[] = [];

  for (const relativePath of pluginPaths) {
    try {
      const absolutePath = resolve(configDir, relativePath);
      const mod = await import(absolutePath);
      const plugin: DenoburnerPlugin = mod.default ?? mod.plugin;

      if (!plugin || !plugin.name) {
        logger.warn(`Plugin at "${relativePath}" has no default export or missing "name"`);
        continue;
      }

      plugins.push(plugin);
      logger.info(`Loaded plugin: ${plugin.name}`);
    } catch (err) {
      logger.warn(`Failed to load plugin "${relativePath}": ${toDenoburnerError(err).message}`);
    }
  }

  return plugins;
}
