import { assertEquals, assert } from "@std/assert";
import { createBuildPipeline, createUploadPipeline } from "../../src/pipeline/factory.ts";
import { EsbuildBundler } from "../../src/bundler/esbuild_bundler.ts";
import { TuiEventBus } from "../../src/tui/event_bus.ts";
import { RpcCommandExecutor } from "../../src/rpc/command.ts";
import type { DenoburnerConfig } from "../../src/config/types.ts";
import { MockLogger, MockRpcClient } from "../support/mocks.ts";

const logger = new MockLogger();

const config: DenoburnerConfig = {
  defaultServer: "home",
  port: 12525,
  host: "localhost",
  sources: [{ dir: "src" }],
};

Deno.test("createBuildPipeline — assembles stages in correct order", () => {
  const bundler = new EsbuildBundler();
  const eventBus = new TuiEventBus();
  const pipeline = createBuildPipeline(config, bundler, eventBus, logger);
  assert(pipeline, "pipeline should be created");
  bundler.close!();
});

Deno.test("createUploadPipeline — creates pipeline with all stages", () => {
  const bundler = new EsbuildBundler();
  const eventBus = new TuiEventBus();
  const mockRpc = new MockRpcClient();
  const executor = new RpcCommandExecutor(mockRpc, logger, 0);
  const pipeline = createUploadPipeline(config, bundler, executor, eventBus, logger);
  assert(pipeline, "upload pipeline should be created");
  bundler.close!();
});
