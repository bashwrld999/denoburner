import { assertEquals } from "@std/assert";
import { TuiEventBridge } from "../../src/cli/tui_event_bridge.ts";
import { TuiEventBus } from "../../src/tui/event_bus.ts";
import { SilentRenderer } from "../../src/tui/silent_renderer.ts";
import { UploadQueueManager } from "../../src/state/queue.ts";
import { FileCache } from "../../src/state/cache.ts";
import { RpcCommandExecutor } from "../../src/rpc/command.ts";
import type { DevEnvironment } from "../../src/main.ts";
import { PendingRequestMap } from "../../src/rpc/pending_requests.ts";

const logger = { info() {}, success() {}, warn() {}, error() {}, child() { return this; } } as any;

function makeEnv(): DevEnvironment {
  return {
    server: { start: async () => {}, stop: async () => {} } as any,
    rpcClient: { sendRequest: () => Promise.resolve({ content: "" }) } as any,
    commandExecutor: { execute: () => Promise.resolve() } as any,
    eventBus: new TuiEventBus(),
    cache: new FileCache(),
    uploadQueue: new UploadQueueManager(),
    pendingRequests: new PendingRequestMap(),
  };
}

Deno.test("TuiEventBridge — file_uploaded updates stats", () => {
  const renderer = new SilentRenderer();
  const env = makeEnv();
  const bridge = new TuiEventBridge(renderer, env, logger, logger, "/tmp", false);
  bridge.setup(env.eventBus);

  env.eventBus.emit({ type: "file_uploaded", filename: "test.js", server: "home", ram: 1.5, durationMs: 100 });

  assertEquals(renderer.stats.filesUploaded, 1);
  assertEquals(renderer.stats.totalRam, 1.5);
  assertEquals(renderer.stats.lastUploadTime > 0, true);
  const files = renderer.stats.servers.get("home");
  assertEquals(files?.length, 1);
  assertEquals(files?.[0].name, "test.js");
});

Deno.test("TuiEventBridge — file_error increments errors", () => {
  const renderer = new SilentRenderer();
  const env = makeEnv();
  const bridge = new TuiEventBridge(renderer, env, logger, logger, "/tmp", false);
  bridge.setup(env.eventBus);

  env.eventBus.emit({ type: "file_error", filename: "bad.js", server: "home", error: "timeout" });
  assertEquals(renderer.stats.errors, 1);
});

Deno.test("TuiEventBridge — file_skipped increments skipCount", () => {
  const renderer = new SilentRenderer();
  const env = makeEnv();
  const bridge = new TuiEventBridge(renderer, env, logger, logger, "/tmp", false);
  bridge.setup(env.eventBus);

  env.eventBus.emit({ type: "file_skipped", filename: "old.js", reason: "unchanged" });
  assertEquals(renderer.stats.skipCount, 1);
});

Deno.test("TuiEventBridge — client_connected updates status", () => {
  const renderer = new SilentRenderer();
  const env = makeEnv();
  const bridge = new TuiEventBridge(renderer, env, logger, logger, "/tmp", false);
  bridge.setup(env.eventBus);

  env.eventBus.emit({ type: "client_connected", clientId: "test-id" });
  assertEquals(renderer.stats.status, "connected");
});

Deno.test("TuiEventBridge — client_disconnected updates status", () => {
  const renderer = new SilentRenderer();
  const env = makeEnv();
  env.uploadQueue.setOffline(true); // set initial state
  const bridge = new TuiEventBridge(renderer, env, logger, logger, "/tmp", false);
  bridge.setup(env.eventBus);

  env.eventBus.emit({ type: "client_disconnected", clientId: "test-id" });
  assertEquals(renderer.stats.status, "disconnected");
});

Deno.test("TuiEventBridge — queue_update updates queue stats", () => {
  const renderer = new SilentRenderer();
  const env = makeEnv();
  const bridge = new TuiEventBridge(renderer, env, logger, logger, "/tmp", false);
  bridge.setup(env.eventBus);

  env.eventBus.emit({ type: "queue_update", pending: 3, failed: 1, processing: true, offline: false });
  assertEquals(renderer.stats.queuePending, 3);
  assertEquals(renderer.stats.queueFailed, 1);
});
