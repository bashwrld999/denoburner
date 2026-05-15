import { assertEquals } from "@std/assert";
import { PathMapStage } from "../../../src/pipeline/stages/path_map.ts";
import type { PipelineContext } from "../../../src/pipeline/types.ts";

function makeCtx(localPath: string): PipelineContext {
  return {
    localPath,
    gameServer: "",
    gameFilename: "",
    startedAt: Date.now(),
  };
}

Deno.test("PathMapStage — preserves values already set by GlobFilterStage", async () => {
  const stage = new PathMapStage("home", "/project");
  const ctx: PipelineContext = {
    localPath: "/project/src/home/lib/sub/hack.ts",
    gameServer: "home",
    gameFilename: "lib/sub/hack.ts",
    startedAt: Date.now(),
  };
  await stage.execute(ctx);
  assertEquals(ctx.gameServer, "home");
  assertEquals(ctx.gameFilename, "lib/sub/hack.ts");
});

Deno.test("PathMapStage — fallback when no values set", async () => {
  const stage = new PathMapStage("home", "/project");
  const ctx = makeCtx("/project/lib/utils/run.ts");
  await stage.execute(ctx);
  assertEquals(ctx.gameServer, "home");
  assertEquals(ctx.gameFilename, "lib/utils/run.ts");
});
