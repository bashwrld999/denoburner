/**
 * Main Wrapper Plugin for esbuild
 * 
 * Wraps the exported `main` function to automatically:
 * 1. Inject CSS before execution
 * 2. Register cleanup with ns.atExit()
 * 
 * The CSS plugin registers functions in:
 * - globalThis.__denoburner_css_inject__ - inject functions
 * - globalThis.__denoburner_css_cleanup__ - cleanup functions
 */

import type { Plugin, PluginBuild } from "npm:esbuild";

/**
 * Create the main wrapper plugin that injects CSS before main() runs
 */
export function mainWrapperPlugin(): Plugin {
  return {
    name: "bitburner-main-wrapper",
    setup(build: PluginBuild) {
      // Use banner to inject the wrapper code at the top of the bundle
      build.onEnd((result) => {
        if (!result.outputFiles || result.outputFiles.length === 0) return;
        
        const outputFile = result.outputFiles[0];
        let content = outputFile.text;
        
        // Check if there's CSS to inject
        const hasCssInject = /__denoburner_css_inject__/.test(content);
        
        if (hasCssInject) {
          // Find and wrap the main function export
          // Pattern 1: export async function main(ns) { ... }
          // Pattern 2: export { main }
          
          let mainWrapped = false;
          
          // Pattern 1: export async function main
          const exportFuncMatch = content.match(/export\s+(async\s+)?function\s+main\s*\(/);
          if (exportFuncMatch) {
            // Remove 'export' from the function declaration
            content = content.replace(
              /export\s+(async\s+)?function\s+main\s*\(/,
              "$1function main("
            );
            // Add wrapped export at the end
            content = content.trimEnd() + `

// Auto-generated wrapper to inject CSS and register cleanup
const __original_main__ = main;
main = async function(ns) {
  // Inject all registered CSS stylesheets
  if (globalThis.__denoburner_css_inject__) {
    for (const inject of globalThis.__denoburner_css_inject__) {
      inject();
    }
  }
  // Register cleanup functions to remove CSS when script exits
  if (globalThis.__denoburner_css_cleanup__) {
    for (const cleanup of globalThis.__denoburner_css_cleanup__) {
      ns.atExit(cleanup);
    }
  }
  return __original_main__(ns);
};
export { main };`;
            mainWrapped = true;
          }
          
          // Pattern 2: export { main } or export { main as main }
          if (!mainWrapped) {
            const exportObjMatch = content.match(/export\s*\{([^}]*)\}/);
            if (exportObjMatch) {
              const exports = exportObjMatch[1].split(",").map((e) => e.trim());
              const mainExport = exports.find((e) => e === "main" || e.match(/^main\s+as\s+main$/));
              
              if (mainExport) {
                // Remove main from the export
                const otherExports = exports.filter((e) => e !== mainExport);
                
                if (otherExports.length > 0) {
                  content = content.replace(
                    /export\s*\{[^}]*\}/,
                    `export { ${otherExports.join(", ")} }`
                  );
                } else {
                  content = content.replace(/export\s*\{[^}]*\}\s*;?\s*/, "");
                }
                
                // Add wrapped export at the end
                content = content.trimEnd() + `

// Auto-generated wrapper to inject CSS and register cleanup
const __original_main__ = main;
main = async function(ns) {
  // Inject all registered CSS stylesheets
  if (globalThis.__denoburner_css_inject__) {
    for (const inject of globalThis.__denoburner_css_inject__) {
      inject();
    }
  }
  // Register cleanup functions to remove CSS when script exits
  if (globalThis.__denoburner_css_cleanup__) {
    for (const cleanup of globalThis.__denoburner_css_cleanup__) {
      ns.atExit(cleanup);
    }
  }
  return __original_main__(ns);
};
export { main };`;
                mainWrapped = true;
              }
            }
          }
          
          if (mainWrapped) {
            outputFile.contents = new TextEncoder().encode(content);
          }
        }
      });
    },
  };
}
