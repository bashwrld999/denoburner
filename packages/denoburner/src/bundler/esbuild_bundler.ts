import * as esbuild from "esbuild";
import { dirname, extname, resolve } from "@std/path";
import type { IBundler, BundleResult, BundlerStrategy } from "./interface.ts";
import { PluginManager } from "./plugin-manager.ts";
import { ExternalStrategy } from "./strategies/external-strategy.ts";
import { reactPlugin } from "./plugins/react.ts";
import { cssPlugin } from "./plugins/css.ts";
import { textPlugin } from "./plugins/text.ts";

export interface EsbuildBundlerOptions {
  strategy?: BundlerStrategy;
  pluginManager?: PluginManager;
  sourceMap?: boolean;
  minify?: boolean;
}

export class EsbuildBundler implements IBundler {
  private strategy: BundlerStrategy;
  private pluginManager: PluginManager;
  private sourceMap: boolean;
  private minify: boolean;

  constructor(options: EsbuildBundlerOptions = {}) {
    this.strategy = options.strategy ?? new ExternalStrategy();
    this.pluginManager = options.pluginManager ?? EsbuildBundler.defaultPluginManager();
    this.sourceMap = options.sourceMap ?? false;
    this.minify = options.minify ?? false;
  }

  static defaultPluginManager(): PluginManager {
    const pm = new PluginManager();
    pm.register({ name: "react", priority: 10, setup: reactPlugin().setup });
    pm.register({ name: "css", priority: 20, setup: cssPlugin().setup });
    pm.register({ name: "text", priority: 30, setup: textPlugin().setup });
    return pm;
  }

  get plugins(): PluginManager {
    return this.pluginManager;
  }

  async bundle(filePath: string, content: string, serverRoot: string): Promise<BundleResult> {
    const absPath = resolve(filePath);
    const plugins = [
      ...this.pluginManager.getEsbuildPlugins(),
    ];

    await this.pluginManager.runBeforeBuild(absPath);

    const ext = extname(filePath);
    const isJsx = ext === ".tsx" || ext === ".jsx";

    const result = await esbuild.build({
      stdin: {
        contents: content,
        resolveDir: this.resolveDir(filePath),
        sourcefile: filePath,
        loader: isJsx ? "tsx" : "ts",
      },
      bundle: true,
      format: "esm",
      platform: "browser",
      write: false,
      sourcemap: this.sourceMap ? "inline" : false,
      minify: this.minify,
      plugins: [
        ...plugins,
        this.createSmartExternalPlugin(serverRoot),
      ] as esbuild.Plugin[],
      jsx: isJsx ? "transform" : undefined,
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
      external: this.strategy.getExternalPatterns(filePath),
    });

    let output = result.outputFiles[0].text;
    output = await this.pluginManager.transformOutput(output, absPath);
    await this.pluginManager.runAfterBuild(result, output);

    return { code: output };
  }

  async transpile(filePath: string, content: string): Promise<BundleResult> {
    const ext = extname(filePath);
    if (ext === ".ts" || ext === ".tsx") {
      const result = await esbuild.transform(content, { loader: "ts", format: "esm" });
      return { code: result.code };
    }
    return { code: content };
  }

  passthrough(content: string): BundleResult {
    return { code: content };
  }

  private createSmartExternalPlugin(serverRoot: string) {
    const normalizedRoot = resolve(serverRoot);
    return {
      name: "smart-external",
      setup(build: esbuild.PluginBuild) {
        build.onResolve({ filter: /.*/ }, (args: esbuild.OnResolveArgs) => {
          if (args.kind === "entry-point") return undefined;
          const resolved = resolve(args.resolveDir, args.path);
          if (resolved.startsWith(normalizedRoot + "/") || resolved === normalizedRoot) {
            return { external: true, path: args.path };
          }
          return undefined;
        });
      },
    };
  }

  private resolveDir(filePath: string): string {
    return dirname(filePath);
  }

  async close(): Promise<void> {
    esbuild.stop();
  }
}
