import { assertEquals, assert } from "@std/assert";
import { SyncOrchestrator, parseImports, resolveImportPath } from "../../src/cli/sync_orchestrator.ts";
import { DependencyGraph } from "../../src/watcher/dependency-graph.ts";
import { UploadPipeline } from "../../src/pipeline/pipeline.ts";
import { GlobFilterStage } from "../../src/pipeline/stages/glob_filter.ts";
import { ReadFileStage } from "../../src/pipeline/stages/read_file.ts";
import { BundleStage } from "../../src/pipeline/stages/bundle.ts";
import { NotifyStage } from "../../src/pipeline/stages/notify.ts";
import { TuiEventBus } from "../../src/tui/event_bus.ts";
import { IdentityBundler } from "../../src/bundler/identity_bundler.ts";
import type { DenoburnerConfig } from "../../src/config/types.ts";

import { MockLogger } from "../support/mocks.ts";

const logger = new MockLogger();

const config: DenoburnerConfig = {
  defaultServer: "home",
  port: 12525,
  host: "localhost",
  sources: [{ dir: "src" }],
};

Deno.test("SyncOrchestrator — scanFiles finds .ts files", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "sync-test-" });
  await Deno.writeTextFile(tmp + "/test.ts", "export function main() {}");
  await Deno.writeTextFile(tmp + "/ignored.txt", "text");

  const depGraph = new DependencyGraph();
  const pipeline = new UploadPipeline()
    .use(new GlobFilterStage([{ dir: tmp }], tmp, "home"))
    .use(new ReadFileStage())
    .use(new BundleStage(new IdentityBundler()))
    .use(new NotifyStage(new TuiEventBus()));

  const sync = new SyncOrchestrator(
    { ...config, sources: [{ dir: tmp }] },
    depGraph, pipeline, logger, logger, tmp,
  );
  await sync.scanFiles();
  assert(sync.files.length >= 1);
  assert(sync.files.some((f) => f.endsWith("test.ts")));

  await Deno.remove(tmp, { recursive: true });
});

Deno.test("SyncOrchestrator — prePopulateGraph registers all files", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "sync-test-" });
  await Deno.writeTextFile(tmp + "/main.ts", 'import { helper } from "./lib.ts";');
  await Deno.writeTextFile(tmp + "/lib.ts", "export function helper() {}");

  const depGraph = new DependencyGraph();
  const pipeline = new UploadPipeline()
    .use(new GlobFilterStage([{ dir: tmp }], tmp, "home"))
    .use(new ReadFileStage())
    .use(new BundleStage(new IdentityBundler()))
    .use(new NotifyStage(new TuiEventBus()));

  const sync = new SyncOrchestrator(
    { ...config, sources: [{ dir: tmp }] },
    depGraph, pipeline, logger, logger, tmp,
  );
  await sync.scanFiles();
  sync.prePopulateGraph();

  const allFiles = depGraph.getAllFiles();
  assert(allFiles.some((f) => f.endsWith("main.ts")));
  assert(allFiles.some((f) => f.endsWith("lib.ts")));

  await Deno.remove(tmp, { recursive: true });
});

Deno.test("parseImports — extracts static imports", () => {
  const deps = parseImports('import { foo } from "./bar.ts";\nimport x from "lodash";');
  assertEquals(deps.includes("./bar.ts"), true);
  assertEquals(deps.includes("lodash"), true);
});

Deno.test("parseImports — extracts dynamic imports", () => {
  const deps = parseImports('const x = await import("./mod.ts");');
  assertEquals(deps.includes("./mod.ts"), true);
});

Deno.test("parseImports — extracts export from", () => {
  const deps = parseImports('export { foo } from "./bar.ts";\nexport * from "./lib.ts";');
  assertEquals(deps.includes("./bar.ts"), true);
  assertEquals(deps.includes("./lib.ts"), true);
});

Deno.test("resolveImportPath — resolves relative paths", () => {
  const r = resolveImportPath("/project/src/main.ts", "./lib/utils.ts");
  assertEquals(r, "/project/src/lib/utils.ts");
});

Deno.test("resolveImportPath — skips external deps", () => {
  assertEquals(resolveImportPath("/p/main.ts", "npm:react"), null);
  assertEquals(resolveImportPath("/p/main.ts", "jsr:@std/assert"), null);
  assertEquals(resolveImportPath("/p/main.ts", "https://deno.land/x/mod.ts"), null);
});
