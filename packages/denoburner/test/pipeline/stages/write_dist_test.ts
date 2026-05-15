import { assertEquals, assert } from "@std/assert";
import { exists } from "@std/fs";
import { join } from "@std/path";
import { WriteDistStage } from "../../../src/pipeline/stages/write_dist.ts";
import type { PipelineContext } from "../../../src/pipeline/types.ts";

Deno.test("WriteDistStage — writes .ts file as .js", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-test-" });

  const stage = new WriteDistStage(tmpDir);
  const ctx: PipelineContext = {
    localPath: "/project/src/home/hack.ts",
    gameServer: "home",
    gameFilename: "hack.ts",
    bundledContent: "export async function main(ns) {}",
    startedAt: Date.now(),
  };

  try {
    await stage.execute(ctx);
    const expectedPath = join(tmpDir, "home", "hack.js");
    assertEquals(ctx.outPath, expectedPath);
    assertEquals(await exists(expectedPath), true);
    const content = await Deno.readTextFile(expectedPath);
    assertEquals(content, "export async function main(ns) {}");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("WriteDistStage — writes non-ts file as-is", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-test-" });

  const stage = new WriteDistStage(tmpDir);
  const ctx: PipelineContext = {
    localPath: "/project/src/data.txt",
    gameServer: "home",
    gameFilename: "data.txt",
    bundledContent: "hello",
    startedAt: Date.now(),
  };

  try {
    await stage.execute(ctx);
    const expectedPath = join(tmpDir, "home", "data.txt");
    assertEquals(ctx.outPath, expectedPath);
    assertEquals(await exists(expectedPath), true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("WriteDistStage — throws without bundledContent", async () => {
  const stage = new WriteDistStage("./dist");
  const ctx: PipelineContext = {
    localPath: "/project/src/test.ts",
    gameServer: "home",
    gameFilename: "test.ts",
    startedAt: Date.now(),
  };

  let threw = false;
  try {
    await stage.execute(ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
