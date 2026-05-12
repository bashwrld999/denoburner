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
export function cssPlugin(): Plugin {
  return {
    name: "bitburner-css",
    setup(build: PluginBuild) {
      build.onLoad({ filter: /.*/ }, (opts) => {
        if (opts.with.type == "css") {
          return {
            contents:
              `import css from '${opts.path}' with {type: 'text'};const sheet = new CSSStyleSheet();await sheet.replace(css);export default sheet;`,
            loader: "js",
          };
        }
      });

      build.onLoad({ filter: /.*/ }, async (opts) => {
        if (opts.with.type == "text") {
          const file = await Deno.readTextFile(opts.path);
          return {
            contents: file,
            loader: "text",
          };
        }
      });
    },
  };
}
