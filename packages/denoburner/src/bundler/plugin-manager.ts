import type * as esbuild from "esbuild";

export interface BundlerPluginHooks {
  beforeBuild?: (entryPoint: string) => void | Promise<void>;
  afterBuild?: (result: esbuild.BuildResult, content: string) => void | Promise<void>;
  transformOutput?: (content: string, entryPoint: string) => string | Promise<string>;
  wrapMain?: (mainCode: string) => string;
}

export interface BundlerPlugin {
  readonly name: string;
  readonly priority?: number;
  setup?: (build: esbuild.PluginBuild) => void;
  hooks?: BundlerPluginHooks;
}

export class PluginManager {
  private plugins: BundlerPlugin[] = [];

  register(plugin: BundlerPlugin): void {
    this.plugins.push(plugin);
    this.plugins.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  }

  remove(name: string): boolean {
    const idx = this.plugins.findIndex((p) => p.name === name);
    if (idx !== -1) { this.plugins.splice(idx, 1); return true; }
    return false;
  }

  getPlugins(): ReadonlyArray<BundlerPlugin> {
    return this.plugins;
  }

  getEsbuildPlugins(): esbuild.Plugin[] {
    return this.plugins.filter((p) => p.setup).map((p) => ({
      name: p.name,
      setup: p.setup!,
    }));
  }

  async runBeforeBuild(entryPoint: string): Promise<void> {
    for (const p of this.plugins) await p.hooks?.beforeBuild?.(entryPoint);
  }

  async runAfterBuild(result: esbuild.BuildResult, content: string): Promise<void> {
    for (const p of this.plugins) await p.hooks?.afterBuild?.(result, content);
  }

  async transformOutput(content: string, entryPoint: string): Promise<string> {
    let r = content;
    for (const p of this.plugins) if (p.hooks?.transformOutput) r = await p.hooks.transformOutput(r, entryPoint);
    return r;
  }

  wrapMain(mainCode: string): string {
    let r = mainCode;
    for (const p of this.plugins) if (p.hooks?.wrapMain) r = p.hooks.wrapMain(r);
    return r;
  }

  clear(): void { this.plugins = []; }
}
