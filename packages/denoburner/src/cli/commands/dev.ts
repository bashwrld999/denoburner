import { defineCommand } from "citty";
import { loadConfig, validateConfig } from "../../config/loader.ts";
import { Logger } from "../../logger/logger.ts";
import { ConsoleTransport } from "../../logger/console_transport.ts";
import { FileTransport } from "../../logger/file_transport.ts";
import { AnsiRenderer } from "../../tui/ansi_renderer.ts";
import { SilentRenderer } from "../../tui/silent_renderer.ts";
import { EsbuildBundler } from "../../bundler/esbuild_bundler.ts";
import { DenoFileWatcher } from "../../watcher/deno_file_watcher.ts";
import { DependencyGraph } from "../../watcher/dependency-graph.ts";
import { DevServer } from "../dev_server.ts";
import { createDevEnvironment } from "../../environment.ts";
import { parsePort } from "../port.ts";
import type { DenoburnerConfig } from "../../config/types.ts";

export default defineCommand({
  meta: {
    name: "dev",
    description: "Start WS server, watch files, upload on change. Keys: q=quit, c=clear, e=expand, l=filter",
  },
  args: {
    port: { type: "string", default: "12525", description: "Port for WebSocket server" },
    host: { type: "string", default: "localhost", description: "Host for WebSocket server" },
    server: { type: "string", default: "home", description: "Default in-game server" },
    quiet: { type: "boolean", default: false, description: "Disable TUI, plain log output" },
    config: { type: "string", alias: "c", description: "Path to config file" },
    verbose: { type: "boolean", default: false, description: "Log cascade info and per-file details" },
    types: { type: "boolean", default: true, description: "Fetch NetscriptDefinitions.d.ts on connect", negativeDescription: "Skip fetching type definitions" },
    dryRun: { type: "boolean", default: false, description: "Scan and log files without uploading" },
  },
  async run({ args }) {
    const isPiped = !Deno.stdout.isTerminal();
    const quiet = args.quiet || isPiped;

    const config = await loadConfig(args.config);

    const port = parsePort(args.port);

    const mergedConfig: DenoburnerConfig = {
      ...config,
      port: port || parseInt(Deno.env.get("DENOBURNER_PORT") ?? "") || config.port,
      host: args.host || Deno.env.get("DENOBURNER_HOST") || config.host,
      defaultServer: args.server || Deno.env.get("DENOBURNER_SERVER") || config.defaultServer,
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
    const systemLog = new Logger();
    systemLog.addTransport(new ConsoleTransport(quiet));
    if (mergedConfig.logFile) {
      systemLog.addTransport(new FileTransport(mergedConfig.logFile));
    }
    const env = createDevEnvironment(mergedConfig, systemLog);

    const bundler = new EsbuildBundler({
      sourceMap: mergedConfig.bundle?.sourceMap,
      minify: mergedConfig.bundle?.minify,
    });

    const maxDepth = mergedConfig.hmr?.maxCascadeDepth ?? 10;
    const depGraph = new DependencyGraph(maxDepth);
    const watcher = new DenoFileWatcher();
    const renderer = quiet ? new SilentRenderer() : new AnsiRenderer();

    const configPath = args.config || findDevConfigPath(cwd);
    const server = new DevServer(
      mergedConfig, renderer, systemLog, env, bundler, depGraph, watcher,
      cwd, args.verbose, args.types, args.dryRun ?? false, configPath,
    );

    function findDevConfigPath(dir: string): string | undefined {
      const candidates = [
        `${dir}/denoburner.config.ts`,
        `${dir}/denoburner.config.js`,
        `${dir}/denoburner/config.ts`,
      ];
      for (const p of candidates) {
        try { Deno.statSync(p); return p; } catch { /* not found */ }
      }
    }

    await server.start();
    await new Promise(() => {});
  },
});
