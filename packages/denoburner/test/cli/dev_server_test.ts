import { assertEquals, assert } from "@std/assert";
import { SilentRenderer } from "../../src/tui/silent_renderer.ts";
import { Logger } from "../../src/logger/logger.ts";
import { ConsoleTransport } from "../../src/logger/console_transport.ts";
import { TuiEventBus } from "../../src/tui/event_bus.ts";
import { FileCache } from "../../src/state/cache.ts";
import { UploadQueueManager } from "../../src/state/queue.ts";
import { DenoFileWatcher } from "../../src/watcher/deno_file_watcher.ts";
import { DependencyGraph } from "../../src/watcher/dependency-graph.ts";
import { IdentityBundler } from "../../src/bundler/identity_bundler.ts";
import { DevServer } from "../../src/cli/dev_server.ts";
import { RpcCommandExecutor } from "../../src/rpc/command.ts";
import type { DenoburnerConfig } from "../../src/config/types.ts";
import type { DevEnvironment } from "../../src/main.ts";
import { PendingRequestMap } from "../../src/rpc/pending_requests.ts";
import type { IRpcClient } from "../../src/rpc/client.ts";

const logger = { info() {}, success() {}, warn() {}, error() {}, child() { return this; } } as any;

const config: DenoburnerConfig = {
  defaultServer: "home",
  port: 0,
  host: "localhost",
  watch: [{ pattern: "**/*.ts", mode: "passthrough" }],
  ignoreInitial: true,
};

function makeEnv(): DevEnvironment {
  const mockRpc: IRpcClient = { sendRequest: () => Promise.resolve({ success: true }) };
  return {
    server: { start: async () => {}, stop: async () => {} } as any,
    rpcClient: mockRpc,
    commandExecutor: new RpcCommandExecutor(mockRpc, logger, 0),
    eventBus: new TuiEventBus(),
    cache: new FileCache(),
    uploadQueue: new UploadQueueManager({ maxRetries: 0, baseDelayMs: 10 }),
    pendingRequests: new PendingRequestMap(),
  };
}

Deno.test("DevServer — creates without error", () => {
  const renderer = new SilentRenderer();
  const env = makeEnv();
  const graph = new DependencyGraph();
  const watcher = new DenoFileWatcher();
  const bundler = new IdentityBundler();
  const log = new Logger();
  log.addTransport(new ConsoleTransport(false));

  const server = new DevServer(config, renderer, log, env, bundler, graph, watcher, "/tmp", false, false);
  assert(server !== null);
});

Deno.test("DevServer — stop is safe before start", async () => {
  (globalThis as any).__test = true;
  const renderer = new SilentRenderer();
  const env = makeEnv();
  const server = new DevServer(config, renderer, logger, env, new IdentityBundler(), new DependencyGraph(), new DenoFileWatcher(), "/tmp", false, false);
  // Should not throw
  await server.stop();
});

Deno.test("DevServer — start creates loggers and pipeline", async () => {
  (globalThis as any).__test = true;
  const tmpDir = await Deno.makeTempDir({ prefix: "dv-" });
  await Deno.writeTextFile(tmpDir + "/test.ts", "export function main() {}");

  const renderer = new SilentRenderer();
  const env = makeEnv();
  const graph = new DependencyGraph();
  const watcher = new DenoFileWatcher();
  const bundler = new IdentityBundler();
  const log = new Logger();
  log.addTransport(new ConsoleTransport(false));

  const server = new DevServer(
    { ...config, ignoreInitial: false, watch: [{ pattern: "**/*.ts", mode: "passthrough" }] },
    renderer, log, env, bundler, graph, watcher, tmpDir, false, false,
  );

  // start() will scan files and run initial sync
  await server.start();
  assertEquals(renderer.stats.watchedCount >= 1, true);

  await server.stop();
  await Deno.remove(tmpDir, { recursive: true });
});
