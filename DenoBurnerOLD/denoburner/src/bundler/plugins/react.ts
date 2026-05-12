/**
 * React Plugin for esbuild
 * 
 * Resolves 'react' and 'react-dom' imports to Bitburner's global React/ReactDOM.
 * Bitburner provides React as a global variable, so we don't need to bundle it.
 */

import type { Plugin, PluginBuild } from "npm:esbuild";

/**
 * Create the React plugin that resolves imports to global variables
 */
export function reactPlugin(): Plugin {
  return {
    name: "bitburner-react",
    setup(build: PluginBuild) {
      // Resolve react and react-dom to our custom namespace
      build.onResolve({ filter: /^react(-dom)?(\/client)?$/ }, (args) => {
        return {
          namespace: "bitburner-react",
          path: args.path,
        };
      });

      // Load react and react-dom as global variables
      build.onLoad(
        { filter: /.*/, namespace: "bitburner-react" },
        (args) => {
          if (args.path === "react") {
            // Export the global React variable
            return {
              contents: "module.exports = React;",
              loader: "js",
            };
          } else if (args.path === "react-dom" || args.path === "react-dom/client") {
            // Export the global ReactDOM variable
            return {
              contents: "module.exports = ReactDOM;",
              loader: "js",
            };
          }
          return null;
        },
      );
    },
  };
}
