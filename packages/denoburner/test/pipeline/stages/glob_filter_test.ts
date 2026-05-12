import { assertEquals } from "@std/assert";
import { GlobFilterStage } from "../../../src/pipeline/stages/glob_filter.ts";
import type { DenoburnerConfig } from "../../../src/config/types.ts";
import type { PipelineContext } from "../../../src/pipeline/types.ts";

const baseConfig: DenoburnerConfig = {
  defaultServer: "home",
  port: 12525,
  host: "localhost",
  watch: [
    { pattern: "**/*.ts", mode: "bundle" },
    { pattern: "**/*.txt", mode: "passthrough" },
    { pattern: "{a,b}/**/*.ts", mode: "bundle" },
    { pattern: "[ch]at.ts", mode: "transpile" },
    { pattern: "??.ts", mode: "passthrough" },
    { pattern: "file?.ts", mode: "bundle" },
  ],
};

function makeCtx(localPath: string): PipelineContext {
  return {
    localPath,
    gameServer: "",
    gameFilename: "",
    startedAt: Date.now(),
  };
}

Deno.test("GlobFilterStage — matches .ts file", async () => {
  const stage = new GlobFilterStage(baseConfig);
  const ctx = makeCtx("/project/src/servers/home/hack.ts");
  await stage.execute(ctx);
  assertEquals(ctx.skipped, undefined);
  assertEquals(ctx.mode, "bundle");
});

Deno.test("GlobFilterStage — matches .txt file", async () => {
  const stage = new GlobFilterStage(baseConfig);
  const ctx = makeCtx("/project/src/data/notes.txt");
  await stage.execute(ctx);
  assertEquals(ctx.skipped, undefined);
  assertEquals(ctx.mode, "passthrough");
});

Deno.test("GlobFilterStage — skips non-matching file", async () => {
  const stage = new GlobFilterStage(baseConfig);
  const ctx = makeCtx("/project/src/secret.json");
  await stage.execute(ctx);
  assertEquals(ctx.skipped, true);
  assertEquals(ctx.skipReason?.includes("secret.json"), true);
});

Deno.test("GlobFilterStage — ignores matching file in ignore list", async () => {
  const config: DenoburnerConfig = {
    ...baseConfig,
    ignore: ["**/*.d.ts"],
  };
  const stage = new GlobFilterStage(config);
  const ctx = makeCtx("/project/src/types.d.ts");
  await stage.execute(ctx);
  assertEquals(ctx.skipped, true);
});

Deno.test("GlobFilterStage — brace expansion {a,b}", async () => {
  const stage = new GlobFilterStage(baseConfig);
  const ctxA = makeCtx("/project/src/a/test.ts");
  await stage.execute(ctxA);
  assertEquals(ctxA.mode, "bundle");

  const ctxB = makeCtx("/project/src/b/test.ts");
  await stage.execute(ctxB);
  assertEquals(ctxB.mode, "bundle");
});

Deno.test("GlobFilterStage — character class [ch]", async () => {
  const config: DenoburnerConfig = {
    ...baseConfig,
    watch: [{ pattern: "[ch]at.ts", mode: "transpile" }],
  };
  const stage = new GlobFilterStage(config);
  const ctx = makeCtx(Deno.cwd() + "/cat.ts");
  await stage.execute(ctx);
  assertEquals(ctx.mode, "transpile");
});

Deno.test("GlobFilterStage — single char wildcard", async () => {
  const config: DenoburnerConfig = {
    ...baseConfig,
    watch: [{ pattern: "??.ts", mode: "passthrough" }],
  };
  const stage = new GlobFilterStage(config);
  const ctx = makeCtx(Deno.cwd() + "/ab.ts");
  await stage.execute(ctx);
  assertEquals(ctx.mode, "passthrough");

  const ctxB = makeCtx(Deno.cwd() + "/abc.ts");
  await stage.execute(ctxB);
  assertEquals(ctxB.skipped, true);
});

Deno.test("GlobFilterStage — zero-segment ** match", async () => {
  const config: DenoburnerConfig = {
    ...baseConfig,
    watch: [{ pattern: "**/test.ts", mode: "bundle" }],
  };
  const stage = new GlobFilterStage(config);
  const ctx = makeCtx("/project/src/test.ts");
  await stage.execute(ctx);
  assertEquals(ctx.skipped, undefined);
  assertEquals(ctx.mode, "bundle");
});
