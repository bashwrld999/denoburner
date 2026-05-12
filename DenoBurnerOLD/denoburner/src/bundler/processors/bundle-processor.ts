/**
 * Bundle Processor
 * 
 * Bundles files using esbuild with Deno plugins.
 */

import * as esbuild from "npm:esbuild";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader";
import { resolve, dirname, basename, extname, join } from "jsr:@std/path";
import type { FileProcessor, BuildContext } from "../interfaces/file-processor.ts";
import type { ProcessedFile, BundledFile } from "../types.ts";
import type { BundlerStrategy } from "../interfaces/bundler-strategy.ts";

/**
 * Bundle Processor Options
 */
export interface BundleProcessorOptions {
  /** Strategy for determining bundling behavior */
  strategy: BundlerStrategy;
}

/**
 * Bundle Processor
 * 
 * Bundles files using esbuild with Deno plugins.
 * Handles JSX, CSS, and other file types through plugins.
 */
export class BundleProcessor implements FileProcessor {
  readonly name = "bundle";
  private strategy: BundlerStrategy;

  constructor(options: BundleProcessorOptions) {
    this.strategy = options.strategy;
  }

  /**
   * Can process when bundle mode is not false and strategy says to bundle
   */
  canProcess(_filePath: string, context: BuildContext): boolean {
    return context.bundleMode !== false;
  }

  /**
   * Process a file - analyze and bundle if needed
   */
  async process(filePath: string, context: BuildContext): Promise<ProcessedFile> {
    // Analyze dependencies
    const depInfo = await context.analyzer.analyze(filePath);

    // Check if bundling is needed
    if (!this.strategy.shouldBundle(depInfo)) {
      // Return raw file
      const content = await Deno.readTextFile(filePath);
      return {
        filename: basename(filePath),
        content,
        bundled: false,
        bundledDeps: 0,
        server: context.server,
      };
    }

    // Bundle the file
    const externalPatterns = this.strategy.getExternalPatterns(filePath);
    const bundled = await this.bundle(filePath, externalPatterns, context, depInfo.external.length);

    return {
      filename: bundled.filename,
      content: bundled.content,
      sourceMap: bundled.sourceMap,
      bundled: bundled.bundled,
      bundledDeps: bundled.bundledDeps,
      server: context.server,
    };
  }

  /**
   * Bundle a file with esbuild
   */
  private async bundle(
    filePath: string,
    external: string[],
    context: BuildContext,
    externalDepCount: number,
  ): Promise<BundledFile> {
    const absolutePath = resolve(filePath);
    const outFilename = this.getOutputFilename(filePath, true);

    try {
      const configPath = await this.findDenoConfig(absolutePath);
      const ext = extname(filePath);
      const isJsxFile = ext === ".tsx" || ext === ".jsx";

      // Run beforeBuild hooks
      await context.pluginManager.runBeforeBuild(absolutePath);

      // Get esbuild plugins
      const esbuildPlugins = context.pluginManager.getEsbuildPlugins();

      const result = await esbuild.build({
        entryPoints: [absolutePath],
        bundle: true,
        write: false,
        format: "esm",
        target: context.options.target,
        minify: context.options.minify,
        sourcemap: context.options.sourceMap ? "linked" : false,
        external,
        plugins: [...esbuildPlugins, ...denoPlugins({ configPath })] as esbuild.Plugin[],
        outfile: outFilename,
        jsx: isJsxFile ? "transform" : undefined,
        jsxFactory: "React.createElement",
        jsxFragment: "React.Fragment",
        loader: {
          ".ts": "ts",
          ".tsx": "tsx",
          ".js": "js",
          ".jsx": "jsx",
        },
        treeShaking: false,
      });

      const outputFiles = result.outputFiles;
      if (!outputFiles || outputFiles.length === 0) {
        throw new Error("No output files generated");
      }

      let content = outputFiles[0].text;
      let sourceMap: string | undefined;
      if (context.options.sourceMap && outputFiles.length > 1) {
        sourceMap = outputFiles[1].text;
      }

      // Transform output through plugins
      content = await context.pluginManager.transformOutput(content, absolutePath);

      // Run afterBuild hooks
      await context.pluginManager.runAfterBuild(result, content);

      return {
        filename: outFilename,
        content,
        sourceMap,
        bundled: true,
        bundledDeps: externalDepCount,
      };
    } catch (error) {
      throw new Error(`Failed to bundle ${filePath}: ${error}`);
    }
  }

  /**
   * Find the deno.json/deno.jsonc config file for a given file
   */
  private async findDenoConfig(filePath: string): Promise<string | undefined> {
    let dir = dirname(filePath);

    while (dir && dir !== "/" && dir !== ".") {
      for (const configName of ["deno.json", "deno.jsonc"]) {
        const configPath = join(dir, configName);
        try {
          const stat = await Deno.stat(configPath);
          if (stat.isFile) {
            return configPath;
          }
        } catch {
          // File doesn't exist, continue
        }
      }

      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }

    return undefined;
  }

  /**
   * Get output filename from input file path
   */
  private getOutputFilename(filePath: string, isBundled: boolean): string {
    const ext = extname(filePath);
    const base = basename(filePath, ext);

    if (isBundled && (ext === ".ts" || ext === ".tsx")) {
      return `${base}.js`;
    }

    return basename(filePath);
  }
}
