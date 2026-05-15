import type { Plugin } from "esbuild";

/** Fallback CSS loader — fires for CSS imports not intercepted by smart-external. */
export function cssPlugin(): Plugin {
  return {
    name: "bitburner-css",
    setup(build) {
      build.onLoad({ filter: /\.css$/ }, async (args) => {
        const file = await Deno.readTextFile(args.path);
        return {
          contents: `const __css = ${JSON.stringify(file)}; globalThis.__css = __css; export default __css;\n`,
          loader: "js",
        };
      });
    },
  };
}
