import { defineCommand } from "citty";
import { walk } from "@std/fs";
import { relative } from "@std/path";
import { loadConfig, validateConfig } from "../../config/loader.ts";
import { Logger } from "../../logger/logger.ts";
import { ConsoleTransport } from "../../logger/console_transport.ts";
import { EsbuildBundler } from "../../bundler/esbuild_bundler.ts";
import { IdentityBundler } from "../../bundler/identity_bundler.ts";
import { TuiEventBus } from "../../tui/event_bus.ts";
import { createBuildPipeline } from "../../pipeline/factory.ts";
import type { DenoburnerConfig } from "../../config/types.ts";
import type { PipelineContext } from "../../pipeline/types.ts";

export default defineCommand({
  meta: {
    name: "build",
    description: "Bundle all scripts to ./dist without uploading",
  },
  args: {
    outDir: { type: "string", default: "./dist" },
    config: { type: "string", alias: "c", description: "Path to config file" },
    verbose: { type: "boolean", default: false, description: "Log per-file build details" },
  },
  async run({ args }) {
    const config = await loadConfig(args.config);
    const mergedConfig: DenoburnerConfig = {
      ...config,
      outDir: args.outDir || config.outDir || "./dist",
    };

    const { errors, warnings } = validateConfig(mergedConfig);
    if (warnings.length > 0) {
      for (const w of warnings) console.error(`  warning: ${w}`);
    }
    if (errors.length > 0) {
      console.error("Config validation errors:");
      for (const e of errors) console.error(`  - ${e}`);
      Deno.exit(1);
    }

    const cwd = Deno.cwd();
    const logger = new Logger();
    logger.addTransport(new ConsoleTransport(true));
    const eventBus = new TuiEventBus(logger);

    const hasTsFiles = mergedConfig.watch.some((w) => w.mode === "bundle" || w.mode === "transpile");
    const bundler = hasTsFiles
      ? new EsbuildBundler({ sourceMap: mergedConfig.sourceMap, minify: mergedConfig.minify })
      : new IdentityBundler();

    const pipeline = createBuildPipeline(mergedConfig, bundler, eventBus, logger);

    const files: string[] = [];
    for await (const entry of walk(cwd, {
      exts: [".ts", ".js", ".jsx", ".tsx", ".txt", ".script"],
      skip: [/node_modules/, /\.git/, /dist/],
    })) {
      if (entry.isFile) files.push(entry.path);
    }

    logger.info(`Building ${files.length} files...`);

    const contexts: PipelineContext[] = files.map((f) => ({
      localPath: f,
      gameServer: mergedConfig.defaultServer,
      gameFilename: relative(cwd, f),
      startedAt: Date.now(),
    }));

    const results = await pipeline.runAll(contexts);

    let successCount = 0;
    let errorCount = 0;
    for (const ctx of results) {
      if (ctx.error) {
        errorCount++;
        logger.error(`${ctx.gameFilename}: ${ctx.error.message}`);
      } else if (!ctx.skipped) {
        successCount++;
        if (args.verbose) {
          logger.info(`  Built: ${ctx.gameFilename}`);
        }
      } else if (args.verbose && ctx.skipped) {
        logger.info(`  Skipped: ${ctx.gameFilename} (${ctx.skipReason})`);
      }
    }

    logger.info(`Build complete: ${successCount} built, ${errorCount} errors`);

    if ("close" in bundler && typeof bundler.close === "function") {
      await bundler.close();
    }
  },
});
