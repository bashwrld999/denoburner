import { assertEquals, assert } from "@std/assert";
import { SilentRenderer } from "../../src/tui/silent_renderer.ts";
import { DevServer } from "../../src/cli/dev_server.ts";
import { DenoFileWatcher } from "../../src/watcher/deno_file_watcher.ts";
import { DependencyGraph } from "../../src/watcher/dependency-graph.ts";
import type { DenoburnerConfig } from "../../src/config/types.ts";
import { makeMockEnv, MockLogger, MockBundler } from "../support/mocks.ts";

const config: DenoburnerConfig = {
  defaultServer: "home",
  port: 0,
  host: "localhost",
  sources: [],
  skipInitialSync: true,
};

Deno.test("DevServer — creates without error", () => {
  const server = new DevServer(
    config, new SilentRenderer(), new MockLogger(), makeMockEnv(),
    new MockBundler(), new DependencyGraph(), new DenoFileWatcher(),
    "/tmp", false, false, false, undefined, false,
  );
  assert(server !== null);
});

Deno.test("DevServer — stop is safe before start", async () => {
  const server = new DevServer(
    config, new SilentRenderer(), new MockLogger(), makeMockEnv(),
    new MockBundler(), new DependencyGraph(), new DenoFileWatcher(),
    "/tmp", false, false, false, undefined, false,
  );
  await server.stop();
});

Deno.test("DevServer — stop rejects pending requests", async () => {
  const env = makeMockEnv();
  const server = new DevServer(
    config, new SilentRenderer(), new MockLogger(), env,
    new MockBundler(), new DependencyGraph(), new DenoFileWatcher(),
    "/tmp", false, false, false, undefined, false,
  );

  const { promise } = env.pendingRequests.add("testMethod");
  assertEquals(env.pendingRequests.size, 1);

  await server.stop();

  assertEquals(env.pendingRequests.size, 0);
  let rejected = false;
  try {
    await promise;
  } catch {
    rejected = true;
  }
  assertEquals(rejected, true);
});

Deno.test("DevServer — stop drains upload queue", async () => {
  const env = makeMockEnv();
  const server = new DevServer(
    config, new SilentRenderer(), new MockLogger(), env,
    new MockBundler(), new DependencyGraph(), new DenoFileWatcher(),
    "/tmp", false, false, false, undefined, false,
  );

  env.uploadQueue.enqueue({
    filePath: "/tmp/test.ts",
    content: "export function main() {}",
    gameServer: "home",
    gameFilename: "test.ts",
  });
  assertEquals(env.uploadQueue.getStats().pending, 1);

  await server.stop();
  const stats = env.uploadQueue.getStats();
  assertEquals(stats.processing, false);
});
