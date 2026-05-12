import { assertEquals, assertStringIncludes } from "@std/assert";
import { ReadFileStage } from "../../../src/pipeline/stages/read_file.ts";
import type { PipelineContext } from "../../../src/pipeline/types.ts";

Deno.test("ReadFileStage — reads file content", async () => {
  const tmpFile = await Deno.makeTempFile({ suffix: ".ts" });
  await Deno.writeTextFile(tmpFile, "export function foo() { return 42; }");

  const stage = new ReadFileStage();
  const ctx: PipelineContext = {
    localPath: tmpFile,
    gameServer: "",
    gameFilename: "",
    startedAt: Date.now(),
  };

  await stage.execute(ctx);
  assertEquals(ctx.rawContent, "export function foo() { return 42; }");
  assertEquals(typeof ctx.byteSize, "number");
  assertEquals(ctx.byteSize! > 0, true);

  await Deno.remove(tmpFile);
});

Deno.test("ReadFileStage — sets byteSize correctly", async () => {
  const tmpFile = await Deno.makeTempFile({ suffix: ".js" });
  const content = "const x = 1;";
  await Deno.writeTextFile(tmpFile, content);

  const stage = new ReadFileStage();
  const ctx: PipelineContext = {
    localPath: tmpFile,
    gameServer: "",
    gameFilename: "",
    startedAt: Date.now(),
  };

  await stage.execute(ctx);
  assertEquals(ctx.byteSize, new TextEncoder().encode(content).length);

  await Deno.remove(tmpFile);
});

Deno.test("ReadFileStage — throws on missing file", async () => {
  const stage = new ReadFileStage();
  const ctx: PipelineContext = {
    localPath: "/tmp/nonexistent_file_12345.ts",
    gameServer: "",
    gameFilename: "",
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
