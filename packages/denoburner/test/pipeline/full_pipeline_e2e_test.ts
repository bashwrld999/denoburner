import { assertEquals, assert } from "@std/assert";
import { GlobFilterStage } from "../../src/pipeline/stages/glob_filter.ts";
import { ReadFileStage } from "../../src/pipeline/stages/read_file.ts";
import { BundleStage } from "../../src/pipeline/stages/bundle.ts";
import { NotifyStage } from "../../src/pipeline/stages/notify.ts";
import { UploadPipeline } from "../../src/pipeline/pipeline.ts";
import { TuiEventBus } from "../../src/tui/event_bus.ts";
import { FileCache } from "../../src/state/cache.ts";
import { IdentityBundler } from "../../src/bundler/identity_bundler.ts";
import { EsbuildBundler } from "../../src/bundler/esbuild_bundler.ts";
import type { SourceEntry } from "../../src/config/types.ts";
import type { PipelineContext } from "../../src/pipeline/types.ts";

const sources: SourceEntry[] = [{ dir: "/tmp/project" }];

Deno.test("E2E pipeline — processes .ts file through all stages", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-e2e-" });
  const filePath = `${tmpDir}/test.ts`;
  await Deno.writeTextFile(filePath, "export function main() { ns.print('hi'); }");

  const eventBus = new TuiEventBus();
  const events: string[] = [];
  eventBus.on((e) => { if (e.type === "file_uploaded") events.push(e.filename); });

  const pipeline = new UploadPipeline()
    .use(new GlobFilterStage([{ dir: tmpDir }], tmpDir, "home"))
    .use(new ReadFileStage())
    .use(new BundleStage(new IdentityBundler()))

    .use(new NotifyStage(eventBus));

  const ctx: PipelineContext = {
    localPath: filePath,
    gameServer: "",
    gameFilename: "test.ts",
    startedAt: Date.now(),
  };

  const result = await pipeline.run(ctx);

  assertEquals(result.skipped, undefined);
  assertEquals(typeof result.rawContent, "string");
  assertEquals(result.rawContent, "export function main() { ns.print('hi'); }");
  assertEquals(result.gameServer, "home");
  assertEquals(typeof result.finishedAt, "number");
  assertEquals(events.length, 1);

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("E2E pipeline — server detection via subdirectory", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-e2e-" });
  const filePath = `${tmpDir}/n00dles/early_hack.ts`;
  await Deno.mkdir(`${tmpDir}/n00dles`, { recursive: true });
  await Deno.writeTextFile(filePath, "export function main() {}");

  const pipeline = new UploadPipeline()
    .use(new GlobFilterStage([{ dir: tmpDir }], tmpDir, "home"))
    .use(new ReadFileStage())
    .use(new BundleStage(new IdentityBundler()))

    .use(new NotifyStage(new TuiEventBus()));

  const ctx: PipelineContext = {
    localPath: filePath,
    gameServer: "",
    gameFilename: "early_hack.ts",
    startedAt: Date.now(),
  };

  const result = await pipeline.run(ctx);
  assertEquals(result.gameServer, "n00dles");
  assertEquals(result.gameFilename, "early_hack.ts");

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("E2E pipeline — skipped file outside source dir", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-e2e-" });
  const filePath = `${tmpDir}/secret.json`;
  await Deno.writeTextFile(filePath, "{}");

  const pipeline = new UploadPipeline()
    .use(new GlobFilterStage([{ dir: "/other/project" }], tmpDir, "home"))
    .use(new ReadFileStage())
    .use(new BundleStage(new IdentityBundler()));

  const ctx: PipelineContext = {
    localPath: filePath,
    gameServer: "",
    gameFilename: "secret.json",
    startedAt: Date.now(),
  };

  const result = await pipeline.run(ctx);
  assertEquals(result.skipped, true);

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("E2E pipeline — FileCache skips unchanged content", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-e2e-" });
  const filePath = `${tmpDir}/test.ts`;
  await Deno.writeTextFile(filePath, "const x = 1;");

  const cache = new FileCache();
  await cache.markUploaded(filePath, "home", "test.ts", "const x = 1;");

  const changed = await cache.hasContentChanged(filePath, "home", "const x = 1;");
  assertEquals(changed, false);

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("E2E pipeline — Cache detects changed content", async () => {
  const cache = new FileCache();
  const tmpFile = await Deno.makeTempFile({ suffix: ".ts" });
  await Deno.writeTextFile(tmpFile, "const x = 1;");
  await cache.markUploaded(tmpFile, "home", "test.ts", "const x = 1;");
  await Deno.writeTextFile(tmpFile, "const x = 2;");

  const changed = await cache.hasContentChanged(tmpFile, "home", "const x = 2;");
  assertEquals(changed, true);

  await Deno.remove(tmpFile);
});

Deno.test("E2E pipeline — DependencyGraph cascades correctly", async () => {
  const { DependencyGraph } = await import("../../src/watcher/dependency-graph.ts");
  const g = new DependencyGraph();
  g.update("/p/a.ts", ["/p/b.ts"]);
  g.update("/p/b.ts", []);

  const r = g.getAffectedFiles("/p/b.ts");
  assertEquals(r.affectedFiles.includes("/p/a.ts"), true);
  assertEquals(r.affectedFiles.includes("/p/b.ts"), true);
});

Deno.test({
  name: "E2E pipeline — full flow with EsbuildBundler",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const tmp = await Deno.makeTempDir({ prefix: "db-e2e-full-" });
    const dir = `${tmp}/n00dles`;
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(`${dir}/scan.ts`,
      "export async function main(ns: NS) { ns.tprint('ok'); }");
    const eventBus = new TuiEventBus();
    const bundler = new EsbuildBundler();
    const pipeline = new UploadPipeline()
      .use(new GlobFilterStage([{ dir: tmp }], tmp, "home"))
      .use(new ReadFileStage())
      .use(new BundleStage(bundler, [{ dir: tmp }], tmp))
      .use(new NotifyStage(eventBus));
    const ctx: PipelineContext = {
      localPath: `${dir}/scan.ts`,
      gameServer: "", gameFilename: "scan.ts", startedAt: Date.now(),
    };
    const result = await pipeline.run(ctx);
    assertEquals(result.gameServer, "n00dles");
    assertEquals(result.skipped, undefined);
    assert(result.bundledContent, "should have bundled content");
    assert(!result.bundledContent!.includes(": NS"), "TS annotations stripped");
    await bundler.close!();
    await Deno.remove(tmp, { recursive: true });
  },
});
