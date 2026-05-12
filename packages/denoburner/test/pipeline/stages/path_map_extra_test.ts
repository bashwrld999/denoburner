import { assertEquals } from "@std/assert";
import { PathMapStage } from "../../../src/pipeline/stages/path_map.ts";
import type { DenoburnerConfig } from "../../../src/config/types.ts";
import type { PipelineContext } from "../../../src/pipeline/types.ts";

const config: DenoburnerConfig = {
  defaultServer: "home",
  port: 12525,
  host: "localhost",
  watch: [{ pattern: "**/*.ts", mode: "bundle" }],
};

function makeCtx(localPath: string): PipelineContext {
  return {
    localPath,
    gameServer: "",
    gameFilename: "",
    startedAt: Date.now(),
  };
}

Deno.test("PathMapStage — servers/home deep nesting", async () => {
  const stage = new PathMapStage(config);
  const ctx = makeCtx("/project/src/servers/home/lib/sub/hack.ts");
  await stage.execute(ctx);
  assertEquals(ctx.gameServer, "home");
  assertEquals(ctx.gameFilename, "lib/sub/hack.ts");
});

Deno.test("PathMapStage — servers at root level with custom serversDir", async () => {
  const customConfig = { ...config, serversDir: "servers" };
  const stage = new PathMapStage(customConfig);
  const ctx = makeCtx("/project/servers/test/run.ts");
  await stage.execute(ctx);
  assertEquals(ctx.gameServer, "test");
  assertEquals(ctx.gameFilename, "run.ts");
});
