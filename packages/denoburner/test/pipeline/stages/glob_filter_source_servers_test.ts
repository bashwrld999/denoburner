import { assertEquals } from "@std/assert";
import { GlobFilterStage } from "../../../src/pipeline/stages/glob_filter.ts";
import type { SourceEntry } from "../../../src/config/types.ts";
import type { PipelineContext } from "../../../src/pipeline/types.ts";

const sources: SourceEntry[] = [
  {
    dir: "/tmp/dbtest/src/servers",
    patterns: [
      { pattern: "**/*.{js,ts,jsx,tsx}", mode: "bundle" },
      { pattern: "**/*.{script,txt,json}", mode: "passthrough" },
    ],
  },
];

Deno.test("GlobFilterStage — routes src/servers/home/main.ts correctly", async () => {
  const stage = new GlobFilterStage(sources, "/tmp/dbtest", "home");
  const ctx: PipelineContext = {
    localPath: "/tmp/dbtest/src/servers/home/main.ts",
    gameServer: "",
    gameFilename: "",
    startedAt: Date.now(),
  };
  await stage.execute(ctx);
  assertEquals(ctx.skipped, undefined);
  assertEquals(ctx.gameServer, "home");
  assertEquals(ctx.gameFilename, "main.ts");
  assertEquals(ctx.mode, "bundle");
});

Deno.test("GlobFilterStage — routes src/servers/home/data.txt correctly", async () => {
  const stage = new GlobFilterStage(sources, "/tmp/dbtest", "home");
  const ctx: PipelineContext = {
    localPath: "/tmp/dbtest/src/servers/home/data.txt",
    gameServer: "",
    gameFilename: "",
    startedAt: Date.now(),
  };
  await stage.execute(ctx);
  assertEquals(ctx.skipped, undefined);
  assertEquals(ctx.gameServer, "home");
  assertEquals(ctx.gameFilename, "data.txt");
  assertEquals(ctx.mode, "passthrough");
});
