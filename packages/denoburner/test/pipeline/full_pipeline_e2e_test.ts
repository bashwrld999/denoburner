import { assertEquals, assert } from "@std/assert";
import { GlobFilterStage } from "../../src/pipeline/stages/glob_filter.ts";
import { ReadFileStage } from "../../src/pipeline/stages/read_file.ts";
import { BundleStage } from "../../src/pipeline/stages/bundle.ts";
import { PathMapStage } from "../../src/pipeline/stages/path_map.ts";
import { WriteDistStage } from "../../src/pipeline/stages/write_dist.ts";
import { NotifyStage } from "../../src/pipeline/stages/notify.ts";
import { UploadPipeline } from "../../src/pipeline/pipeline.ts";
import { TuiEventBus } from "../../src/tui/event_bus.ts";
import { FileCache } from "../../src/state/cache.ts";
import { IdentityBundler } from "../../src/bundler/identity_bundler.ts";
import type { DenoburnerConfig } from "../../src/config/types.ts";
import type { PipelineContext } from "../../src/pipeline/types.ts";

const config: DenoburnerConfig = {
  defaultServer: "home",
  port: 12525,
  host: "localhost",
  watch: [
    { pattern: "**/*.ts", mode: "bundle" },
    { pattern: "**/*.txt", mode: "passthrough" },
  ],
};

Deno.test("E2E pipeline — processes .ts file through all stages", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-e2e-" });
  const filePath = `${tmpDir}/test.ts`;
  await Deno.writeTextFile(filePath, "export function main() { ns.print('hi'); }");

  const eventBus = new TuiEventBus();
  const events: string[] = [];
  eventBus.on((e) => { if (e.type === "file_uploaded") events.push(e.filename); });

  const pipeline = new UploadPipeline()
    .use(new GlobFilterStage(config))
    .use(new ReadFileStage())
    .use(new BundleStage(new IdentityBundler()))
    .use(new PathMapStage(config))
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

Deno.test("E2E pipeline — server detection via /src/servers/ dir", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-e2e-" });
  const serverDir = `${tmpDir}/src/servers/n00dles`;
  await Deno.mkdir(serverDir, { recursive: true });
  const filePath = `${serverDir}/early_hack.ts`;
  await Deno.writeTextFile(filePath, "export function main() {}");

  const pipeline = new UploadPipeline()
    .use(new GlobFilterStage(config))
    .use(new ReadFileStage())
    .use(new BundleStage(new IdentityBundler()))
    .use(new PathMapStage(config))
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

Deno.test("E2E pipeline — skipped file doesn't match watch pattern", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "denoburner-e2e-" });
  const filePath = `${tmpDir}/secret.json`;
  await Deno.writeTextFile(filePath, "{}");

  const pipeline = new UploadPipeline()
    .use(new GlobFilterStage(config))
    .use(new ReadFileStage())
    .use(new BundleStage(new IdentityBundler()))
    .use(new PathMapStage(config));

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
