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

Deno.test("PathMapStage — extracts server from path with /servers/", async () => {
  const stage = new PathMapStage(config);
  const ctx = makeCtx("/project/src/servers/home/hack.ts");
  await stage.execute(ctx);
  assertEquals(ctx.gameServer, "home");
  assertEquals(ctx.gameFilename, "hack.ts");
});

Deno.test("PathMapStage — extracts nested filename", async () => {
  const stage = new PathMapStage(config);
  const ctx = makeCtx("/project/src/servers/n00dles/lib/helper.ts");
  await stage.execute(ctx);
  assertEquals(ctx.gameServer, "n00dles");
  assertEquals(ctx.gameFilename, "lib/helper.ts");
});

Deno.test("PathMapStage — preserves directory structure for non-server files", async () => {
  const stage = new PathMapStage(config);
  const testPath = Deno.cwd() + "/lib/utils/helper.ts";
  const ctx = makeCtx(testPath);
  await stage.execute(ctx);
  assertEquals(ctx.gameServer, "home");
  assertEquals(ctx.gameFilename, "lib/utils/helper.ts");
});

Deno.test("PathMapStage — handles Windows-style paths", async () => {
  const stage = new PathMapStage(config);
  const ctx = makeCtx("C:\\project\\src\\servers\\home\\hack.ts");
  await stage.execute(ctx);
  assertEquals(ctx.gameServer, "home");
  assertEquals(ctx.gameFilename, "hack.ts");
});
