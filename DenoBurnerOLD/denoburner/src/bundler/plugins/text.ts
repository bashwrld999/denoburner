/**
 * CSS Plugin for esbuild
 *
 * Resolves CSS imports and injects them into the document at runtime.
 * Uses <style> elements for reliable style injection and cleanup.
 * Provides cleanup function to remove styles when script exits.
 *
 * IMPORTANT: Uses indirect eval to access document to avoid Bitburner RAM cost.
 * Direct references to `document`, `window`, or `globalThis` would cost 50GB RAM.
 */

import type { Plugin, PluginBuild } from "npm:esbuild";
import { resolve } from "jsr:@std/path";

/**
 * Create the CSS plugin that injects styles into the document
 */
export function textPlugin(): Plugin {
  return {
    name: "bitburner-text",
    setup(build: PluginBuild) {
      // Load CSS files and wrap them in injection code
      build.onLoad(
        { filter: /.*/ },
        async (args) => {
          if (args.with.type == "text") {
            const file = await Deno.readTextFile(args.path);
            return {
              contents: file,
              loader: "text",
            };
          }
        },
      );
    },
  };
}
