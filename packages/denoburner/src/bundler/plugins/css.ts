import type { Plugin } from "esbuild";

export function cssPlugin(): Plugin {
  return {
    name: "bitburner-css",
    setup(build) {
      build.onLoad({ filter: /\.css$/ }, async (args) => {
        const file = await Deno.readTextFile(args.path);
        return { contents: file, loader: "text" };
      });
    },
  };
}
