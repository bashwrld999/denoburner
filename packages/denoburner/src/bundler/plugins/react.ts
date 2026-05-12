import type { Plugin } from "esbuild";

export function reactPlugin(): Plugin {
  return {
    name: "bitburner-react",
    setup(build) {
      build.onResolve({ filter: /^react(-dom)?(\/client)?$/ }, (args) => ({
        namespace: "bitburner-react",
        path: args.path,
      }));

      build.onLoad({ filter: /.*/, namespace: "bitburner-react" }, (args) => {
        if (args.path === "react") {
          return { contents: "module.exports = React;", loader: "js" };
        }
        if (args.path === "react-dom" || args.path === "react-dom/client") {
          return { contents: "module.exports = ReactDOM;", loader: "js" };
        }
        return null;
      });
    },
  };
}
