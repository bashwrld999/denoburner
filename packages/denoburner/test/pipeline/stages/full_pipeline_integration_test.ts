import { assertEquals, assert } from "@std/assert";
import { GlobFilterStage } from "../../../src/pipeline/stages/glob_filter.ts";
import { ReadFileStage } from "../../../src/pipeline/stages/read_file.ts";
import { WriteDistStage } from "../../../src/pipeline/stages/write_dist.ts";
import { NotifyStage } from "../../../src/pipeline/stages/notify.ts";
import { UploadPipeline } from "../../../src/pipeline/pipeline.ts";
import { TuiEventBus } from "../../../src/tui/event_bus.ts";
import { FileCache } from "../../../src/state/cache.ts";
import { DependencyGraph } from "../../../src/watcher/dependency-graph.ts";
import type { PipelineContext } from "../../../src/pipeline/types.ts";

Deno.test("Pipeline with FileCache — skips unchanged files, uploads changed", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-cache-" });
  const filePath = tmpDir + "/hack.ts";
  await Deno.writeTextFile(filePath, "const x = 1;");

  const cache = new FileCache();
  const eventBus = new TuiEventBus();
  const pipeline = new UploadPipeline()
    .use(new GlobFilterStage([{ dir: tmpDir }], tmpDir, "home"))
    .use(new ReadFileStage())
    .use(new NotifyStage(eventBus));

  const ctx1: PipelineContext = {
    localPath: filePath,
    gameServer: "",
    gameFilename: "hack.ts",
    startedAt: Date.now(),
  };
  const result1 = await pipeline.run(ctx1);
  assertEquals(result1.skipped, undefined);

  await cache.markUploaded(filePath, "home", "hack.ts", "const x = 1;");

  const needed1 = await cache.needsUpload(filePath, "home", "hack.ts");
  assertEquals(needed1, false);

  await Deno.writeTextFile(filePath, "const x = 2;");
  const needed2 = await cache.needsUpload(filePath, "home", "hack.ts");
  assertEquals(needed2, true);

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("Pipeline with FileCache — caching respects server context", async () => {
  const cache = new FileCache();
  const tmpFile = await Deno.makeTempFile({ suffix: ".ts" });
  await Deno.writeTextFile(tmpFile, "content");

  await cache.markUploaded(tmpFile, "home", "f.ts", "content");
  assertEquals(await cache.needsUpload(tmpFile, "home", "f.ts"), false);
  assertEquals(await cache.needsUpload(tmpFile, "n00dles", "f.ts"), true);

  await Deno.remove(tmpFile);
});

Deno.test("DependencyGraph cascading — getAffectedFiles traverses dependencies", () => {
  const g = new DependencyGraph();
  g.update("src/a.ts", ["./b.ts"]);
  g.update("src/b.ts", ["./c.ts"]);
  g.update("src/c.ts", []);

  const r = g.getAffectedFiles("src/c.ts");
  assertEquals(r.affectedFiles.includes("src/c.ts"), true);
  assertEquals(r.affectedFiles.includes("src/b.ts"), true);
  assertEquals(r.affectedFiles.includes("src/a.ts"), true);
});

Deno.test("DependencyGraph — updates cascade when file is re-analyzed", () => {
  const g = new DependencyGraph();
  g.update("a.ts", ["./b.ts"]);
  g.update("b.ts", []);
  g.update("c.ts", ["./a.ts"]);

  g.update("a.ts", []);
  const r = g.getAffectedFiles("b.ts");
  assertEquals(r.affectedFiles.length, 1);
  assertEquals(r.affectedFiles[0], "b.ts");
});

Deno.test("WriteDistStage — writes bundled content to correct path", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-write-" });

  const stage = new WriteDistStage(tmpDir);
  const ctx: PipelineContext = {
    localPath: "/p/hack.ts",
    gameServer: "home",
    gameFilename: "hack.ts",
    bundledContent: "export function main() {}",
    startedAt: Date.now(),
  };

  await stage.execute(ctx);
  assert(ctx.outPath);
  const content = await Deno.readTextFile(ctx.outPath);
  assertEquals(content, "export function main() {}");

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("WriteDistStage — renames .tsx/.ts to .js", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-write2-" });

  const stage = new WriteDistStage(tmpDir);
  const ctx: PipelineContext = {
    localPath: "/p/component.tsx",
    gameServer: "n00dles",
    gameFilename: "component.tsx",
    bundledContent: "export function C() {}",
    startedAt: Date.now(),
  };

  await stage.execute(ctx);
  assert(ctx.outPath);
  assertEquals(ctx.outPath.endsWith("component.js"), true);
  const content = await Deno.readTextFile(ctx.outPath);
  assertEquals(content, "export function C() {}");

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("Pipeline concurrency — runAll processes files in parallel", async () => {
  const stage = {
    name: "counter",
    calls: 0,
    async execute(_ctx: PipelineContext) {
      this.calls++;
      await new Promise((r) => setTimeout(r, 10));
    },
  };

  const pipeline = new UploadPipeline(4).use(stage);
  const contexts = Array.from({ length: 8 }, (_, i) => ({
    localPath: `/p/${i}.ts`,
    gameServer: "",
    gameFilename: `${i}.ts`,
    startedAt: Date.now(),
  }));

  const start = performance.now();
  const results = await pipeline.runAll(contexts);
  const elapsed = performance.now() - start;

  assertEquals(results.length, 8);
  assertEquals(stage.calls, 8);
  assert(elapsed < 60, `Expected <60ms with concurrency 4, got ${elapsed}ms`);
});
