import { assertEquals } from "@std/assert";
import { TuiEventBridge } from "../../src/cli/tui_event_bridge.ts";
import { SilentRenderer } from "../../src/tui/silent_renderer.ts";
import { MockLogger, makeMockEnv } from "../support/mocks.ts";

const logger = new MockLogger();

Deno.test("TuiEventBridge — file_uploaded updates stats", () => {
  const renderer = new SilentRenderer();
  const env = makeMockEnv();
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
  const env = makeMockEnv();
  const bridge = new TuiEventBridge(renderer, env, logger, logger, "/tmp", false);
  bridge.setup(env.eventBus);

  env.eventBus.emit({ type: "file_error", filename: "bad.js", server: "home", error: "timeout" });
  assertEquals(renderer.stats.errors, 1);
});

Deno.test("TuiEventBridge — file_skipped increments skipCount", () => {
  const renderer = new SilentRenderer();
  const env = makeMockEnv();
  const bridge = new TuiEventBridge(renderer, env, logger, logger, "/tmp", false);
  bridge.setup(env.eventBus);

  env.eventBus.emit({ type: "file_skipped", filename: "old.js", reason: "unchanged" });
  assertEquals(renderer.stats.skipCount, 1);
});

Deno.test("TuiEventBridge — client_connected updates status", () => {
  const renderer = new SilentRenderer();
  const env = makeMockEnv();
  const bridge = new TuiEventBridge(renderer, env, logger, logger, "/tmp", false);
  bridge.setup(env.eventBus);

  env.eventBus.emit({ type: "client_connected", clientId: "test-id" });
  assertEquals(renderer.stats.status, "connected");
});

Deno.test("TuiEventBridge — client_disconnected updates status", () => {
  const renderer = new SilentRenderer();
  const env = makeMockEnv();
  env.uploadQueue.setOffline(true);
  const bridge = new TuiEventBridge(renderer, env, logger, logger, "/tmp", false);
  bridge.setup(env.eventBus);

  env.eventBus.emit({ type: "client_disconnected", clientId: "test-id" });
  assertEquals(renderer.stats.status, "disconnected");
});

Deno.test("TuiEventBridge — queue_update updates queue stats", () => {
  const renderer = new SilentRenderer();
  const env = makeMockEnv();
  const bridge = new TuiEventBridge(renderer, env, logger, logger, "/tmp", false);
  bridge.setup(env.eventBus);

  env.eventBus.emit({ type: "queue_update", pending: 3, failed: 1, processing: true, offline: false });
  assertEquals(renderer.stats.queuePending, 3);
  assertEquals(renderer.stats.queueFailed, 1);
});
