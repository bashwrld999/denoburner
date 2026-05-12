import type { Plugin } from "esbuild";

export function textPlugin(): Plugin {
  return {
    name: "bitburner-text",
    setup(build) {
      build.onLoad({ filter: /\.(txt|md|json|yaml|yml|xml|csv)$/ }, async (args) => {
        const file = await Deno.readTextFile(args.path);
        return { contents: file, loader: "text" };
      });
    },
  };
}
