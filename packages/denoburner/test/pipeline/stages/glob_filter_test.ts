import { assertEquals } from "@std/assert";
import { GlobFilterStage } from "../../../src/pipeline/stages/glob_filter.ts";
import type { SourceEntry } from "../../../src/config/types.ts";
import type { PipelineContext } from "../../../src/pipeline/types.ts";

const sources: SourceEntry[] = [{ dir: "/project/src" }];

function makeCtx(localPath: string): PipelineContext {
  return {
    localPath,
    gameServer: "",
    gameFilename: "",
    startedAt: Date.now(),
  };
}

Deno.test("GlobFilterStage — resolves .ts file under source", async () => {
  const stage = new GlobFilterStage(sources, "/project", "home");
  const ctx = makeCtx("/project/src/home/hack.ts");
  await stage.execute(ctx);
  assertEquals(ctx.skipped, undefined);
  assertEquals(ctx.mode, "bundle");
  assertEquals(ctx.gameServer, "home");
  assertEquals(ctx.gameFilename, "hack.ts");
});

Deno.test("GlobFilterStage — resolves .txt file as passthrough", async () => {
  const stage = new GlobFilterStage(sources, "/project", "home");
  const ctx = makeCtx("/project/src/data/notes.txt");
  await stage.execute(ctx);
  assertEquals(ctx.skipped, undefined);
  assertEquals(ctx.mode, "passthrough");
  assertEquals(ctx.gameServer, "data");
  assertEquals(ctx.gameFilename, "notes.txt");
});

Deno.test("GlobFilterStage — skips file outside source", async () => {
  const stage = new GlobFilterStage(sources, "/project", "home");
  const ctx = makeCtx("/project/lib/secret.json");
  await stage.execute(ctx);
  assertEquals(ctx.skipped, true);
});

Deno.test("GlobFilterStage — file at source root uses defaultServer", async () => {
  const stage = new GlobFilterStage(sources, "/project", "home");
  const ctx = makeCtx("/project/src/lib.ts");
  await stage.execute(ctx);
  assertEquals(ctx.skipped, undefined);
  assertEquals(ctx.gameServer, "home");
  assertEquals(ctx.gameFilename, "lib.ts");
});

Deno.test("GlobFilterStage — source with server override", async () => {
  const overrideSources: SourceEntry[] = [{ dir: "/project/src", server: "foodnstuff" }];
  const stage = new GlobFilterStage(overrideSources, "/project", "home");
  const ctx = makeCtx("/project/src/home/hack.ts");
  await stage.execute(ctx);
  assertEquals(ctx.gameServer, "foodnstuff");
  assertEquals(ctx.gameFilename, "home/hack.ts");
});

Deno.test("GlobFilterStage — source mode overrides auto-detect", async () => {
  const fixedSources: SourceEntry[] = [{ dir: "/project/src", mode: "transpile" }];
  const stage = new GlobFilterStage(fixedSources, "/project", "home");
  const ctx = makeCtx("/project/src/home/main.ts");
  await stage.execute(ctx);
  assertEquals(ctx.mode, "transpile");
});

Deno.test("GlobFilterStage — multiple sources, first match wins", async () => {
  const multiSources: SourceEntry[] = [
    { dir: "/project/shared", server: "home" },
    { dir: "/project/src" },
  ];
  const stage = new GlobFilterStage(multiSources, "/project", "home");
  const ctx = makeCtx("/project/shared/lib/utils.ts");
  await stage.execute(ctx);
  assertEquals(ctx.gameServer, "home");
  assertEquals(ctx.gameFilename, "lib/utils.ts");
});
