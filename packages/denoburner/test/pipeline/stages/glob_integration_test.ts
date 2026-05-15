import { assertEquals } from "@std/assert";
import { GlobFilterStage } from "../../../src/pipeline/stages/glob_filter.ts";
import { ReadFileStage } from "../../../src/pipeline/stages/read_file.ts";
import { IdentityBundler } from "../../../src/bundler/identity_bundler.ts";
import { BundleStage } from "../../../src/pipeline/stages/bundle.ts";
import { NotifyStage } from "../../../src/pipeline/stages/notify.ts";
import { UploadPipeline } from "../../../src/pipeline/pipeline.ts";
import { TuiEventBus } from "../../../src/tui/event_bus.ts";
import type { PipelineContext } from "../../../src/pipeline/types.ts";

Deno.test("Full build pipeline — .ts file", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-int-" });
  const filePath = tmpDir + "/hack.ts";
  await Deno.writeTextFile(filePath, "export async function main(ns) { ns.print('hi'); }");

  const eventBus = new TuiEventBus();
  const events: string[] = [];
  eventBus.on((e) => { if (e.type === "file_uploaded") events.push(e.filename); });

  const bundler = new IdentityBundler();
  const pipeline = new UploadPipeline()
    .use(new GlobFilterStage([{ dir: tmpDir }], tmpDir, "home"))
    .use(new ReadFileStage())
    .use(new BundleStage(bundler))
    .use(new NotifyStage(eventBus));

  const ctx: PipelineContext = {
    localPath: filePath,
    gameServer: "home",
    gameFilename: "hack.ts",
    startedAt: Date.now(),
  };

  const result = await pipeline.run(ctx);

  assertEquals(result.skipped, undefined);
  assertEquals(result.rawContent, "export async function main(ns) { ns.print('hi'); }");
  assertEquals(result.bundledContent, "export async function main(ns) { ns.print('hi'); }");
  assertEquals(result.gameServer, "home");
  assertEquals(typeof result.finishedAt, "number");
  assertEquals(events.length, 1);

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("Full build pipeline — .txt file passthrough", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-int-" });
  const filePath = tmpDir + "/notes.txt";
  await Deno.writeTextFile(filePath, "some notes");

  const eventBus = new TuiEventBus();
  const bundler = new IdentityBundler();
  const pipeline = new UploadPipeline()
    .use(new GlobFilterStage([{ dir: tmpDir }], tmpDir, "home"))
    .use(new ReadFileStage())
    .use(new BundleStage(bundler))
    .use(new NotifyStage(eventBus));

  const ctx: PipelineContext = {
    localPath: filePath,
    gameServer: "",
    gameFilename: "notes.txt",
    startedAt: Date.now(),
  };

  const result = await pipeline.run(ctx);

  assertEquals(result.mode, "passthrough");
  assertEquals(result.rawContent, "some notes");

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("Full build pipeline — skipped file outside source dir", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-int-" });
  const filePath = tmpDir + "/secret.json";
  await Deno.writeTextFile(filePath, "{}");

  const eventBus = new TuiEventBus();
  const bundler = new IdentityBundler();
  const pipeline = new UploadPipeline()
    .use(new GlobFilterStage([{ dir: "/other/project" }], tmpDir, "home"))
    .use(new ReadFileStage())
    .use(new BundleStage(bundler))
    .use(new NotifyStage(eventBus));

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

Deno.test("Full build pipeline — server detection via subdirectory", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-int-" });
  const filePath = tmpDir + "/n00dles/early_hack.ts";
  await Deno.mkdir(tmpDir + "/n00dles", { recursive: true });
  await Deno.writeTextFile(filePath, "export function main() {}");

  const eventBus = new TuiEventBus();
  const bundler = new IdentityBundler();
  const pipeline = new UploadPipeline()
    .use(new GlobFilterStage([{ dir: tmpDir }], tmpDir, "home"))
    .use(new ReadFileStage())
    .use(new BundleStage(bundler))
    .use(new NotifyStage(eventBus));

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
