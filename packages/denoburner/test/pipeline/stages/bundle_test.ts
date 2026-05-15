import { assertEquals, assert } from "@std/assert";
import { BundleStage } from "../../../src/pipeline/stages/bundle.ts";
import { IdentityBundler } from "../../../src/bundler/identity_bundler.ts";
import { EsbuildBundler } from "../../../src/bundler/esbuild_bundler.ts";
import type { PipelineContext } from "../../../src/pipeline/types.ts";

Deno.test("BundleStage — passthrough mode returns raw content", async () => {
  const stage = new BundleStage(new IdentityBundler());
  const ctx: PipelineContext = {
    localPath: "/project/src/test.txt",
    gameServer: "",
    gameFilename: "test.txt",
    rawContent: "hello world",
    mode: "passthrough",
    startedAt: Date.now(),
  };

  await stage.execute(ctx);
  assertEquals(ctx.bundledContent, "hello world");
});

Deno.test("BundleStage — transpile mode with IdentityBundler", async () => {
  const stage = new BundleStage(new IdentityBundler());
  const ctx: PipelineContext = {
    localPath: "/project/src/test.ts",
    gameServer: "",
    gameFilename: "test.ts",
    rawContent: "const x: number = 1;",
    mode: "transpile",
    startedAt: Date.now(),
  };

  await stage.execute(ctx);
  assertEquals(ctx.bundledContent, "const x: number = 1;");
});

Deno.test("BundleStage — bundle mode with IdentityBundler (noop)", async () => {
  const stage = new BundleStage(new IdentityBundler());
  const ctx: PipelineContext = {
    localPath: "/project/src/home/hack.ts",
    gameServer: "",
    gameFilename: "hack.ts",
    rawContent: "export async function main(ns) {}",
    mode: "bundle",
    startedAt: Date.now(),
  };

  await stage.execute(ctx);
  assertEquals(ctx.bundledContent, "export async function main(ns) {}");
});

Deno.test("BundleStage — throws without rawContent", async () => {
  const stage = new BundleStage(new IdentityBundler());
  const ctx: PipelineContext = {
    localPath: "/project/src/test.ts",
    gameServer: "",
    gameFilename: "test.ts",
    mode: "passthrough",
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

Deno.test({
  name: "BundleStage — esbuild transpile .ts to .js",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const bundler = new EsbuildBundler();
    const stage = new BundleStage(bundler);
    const ctx: PipelineContext = {
      localPath: "/project/src/test.ts",
      gameServer: "",
      gameFilename: "test.ts",
      rawContent: "const x: number = 42; export { x };",
      mode: "transpile",
      startedAt: Date.now(),
    };

    await stage.execute(ctx);
    assertEquals(typeof ctx.bundledContent, "string");
    assertEquals(ctx.bundledContent!.includes("const x = 42"), true);

    await bundler.close!();
  },
});

Deno.test({
  name: "BundleStage — esbuild bundle mode produces valid output",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const tmp = await Deno.makeTempDir({ prefix: "db-bundle-" });
    const filePath = `${tmp}/home/hack.ts`;
    await Deno.mkdir(`${tmp}/home`, { recursive: true });
    await Deno.writeTextFile(filePath,
      "export async function main(ns: NS) { ns.print('hi'); }");
    const bundler = new EsbuildBundler();
    const stage = new BundleStage(bundler, [{ dir: tmp }], tmp);
    const ctx: PipelineContext = {
      localPath: filePath,
      gameServer: "", gameFilename: "hack.ts", startedAt: Date.now(),
      rawContent: await Deno.readTextFile(filePath),
      mode: "bundle",
    };
    await stage.execute(ctx);
    assert(ctx.bundledContent, "bundled content should exist");
    assert(ctx.bundledContent!.includes("main"), "output should contain main function");
    assert(!ctx.bundledContent!.includes(": NS"), "TypeScript annotations should be stripped");
    await bundler.close!();
    await Deno.remove(tmp, { recursive: true });
  },
});
