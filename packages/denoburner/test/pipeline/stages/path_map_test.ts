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

Deno.test("PathMapStage — preserves already-set values", async () => {
  const stage = new PathMapStage("home", "/project");
  const ctx: PipelineContext = {
    localPath: "/project/src/home/hack.ts",
    gameServer: "home",
    gameFilename: "hack.ts",
    startedAt: Date.now(),
  };
  await stage.execute(ctx);
  assertEquals(ctx.gameServer, "home");
  assertEquals(ctx.gameFilename, "hack.ts");
});

Deno.test("PathMapStage — falls back to defaultServer and cwd-relative path", async () => {
  const stage = new PathMapStage("home", "/project");
  const ctx = makeCtx("/project/lib/utils/helper.ts");
  await stage.execute(ctx);
  assertEquals(ctx.gameServer, "home");
  assertEquals(ctx.gameFilename, "lib/utils/helper.ts");
});

Deno.test("PathMapStage — handles path not under cwd", async () => {
  const stage = new PathMapStage("n00dles", "/other");
  const ctx = makeCtx("/project/file.ts");
  await stage.execute(ctx);
  assertEquals(ctx.gameServer, "n00dles");
  assertEquals(ctx.gameFilename, "/project/file.ts");
});
