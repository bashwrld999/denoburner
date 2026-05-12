import { assertEquals } from "@std/assert";
import { UploadPipeline } from "../../src/pipeline/pipeline.ts";
import type { PipelineStage, PipelineContext } from "../../src/pipeline/types.ts";

function makeCounterStage(name: string): PipelineStage & { calls: number } {
  let calls = 0;
  return {
    name,
    get calls() { return calls; },
    async execute(ctx: PipelineContext) {
      calls++;
      ctx.gameServer = "home";
    },
  };
}

const errorStage: PipelineStage = {
  name: "error_stage",
  async execute(_ctx: PipelineContext) {
    throw new Error("Stage failed");
  },
};

const skipStage: PipelineStage = {
  name: "skip_stage",
  async execute(ctx: PipelineContext) {
    ctx.skipped = true;
    ctx.skipReason = "intentional skip";
  },
};

Deno.test("UploadPipeline — runs all stages in order", async () => {
  const s1 = makeCounterStage("s1");
  const s2 = makeCounterStage("s2");
  const s3 = makeCounterStage("s3");

  const pipeline = new UploadPipeline()
    .use(s1)
    .use(s2)
    .use(s3);

  const ctx: PipelineContext = {
    localPath: "/test.ts",
    gameServer: "",
    gameFilename: "test.ts",
    startedAt: Date.now(),
  };

  const result = await pipeline.run(ctx);
  assertEquals(s1.calls, 1);
  assertEquals(s2.calls, 1);
  assertEquals(s3.calls, 1);
  assertEquals(result.gameServer, "home");
  assertEquals(typeof result.finishedAt, "number");
});

Deno.test("UploadPipeline — stops on error", async () => {
  const s1 = makeCounterStage("s1");

  const pipeline = new UploadPipeline()
    .use(s1)
    .use(errorStage)
    .use({ name: "never_run", async execute() {} });

  const ctx: PipelineContext = {
    localPath: "/test.ts",
    gameServer: "",
    gameFilename: "test.ts",
    startedAt: Date.now(),
  };

  const result = await pipeline.run(ctx);
  assertEquals(s1.calls, 1);
  assertEquals(result.error?.message, "Stage failed");
});

Deno.test("UploadPipeline — stops on skip", async () => {
  const s1 = makeCounterStage("s1");

  const pipeline = new UploadPipeline()
    .use(s1)
    .use(skipStage)
    .use({ name: "never_run", async execute() {} });

  const ctx: PipelineContext = {
    localPath: "/test.ts",
    gameServer: "",
    gameFilename: "test.ts",
    startedAt: Date.now(),
  };

  const result = await pipeline.run(ctx);
  assertEquals(s1.calls, 1);
  assertEquals(result.skipped, true);
});

Deno.test("UploadPipeline — runAll processes all contexts with concurrency", async () => {
  const s1 = makeCounterStage("s1");
  const pipeline = new UploadPipeline(4).use(s1);

  const contexts = [
    { localPath: "/a.ts", gameServer: "", gameFilename: "a.ts", startedAt: Date.now() },
    { localPath: "/b.ts", gameServer: "", gameFilename: "b.ts", startedAt: Date.now() },
  ];

  const results = await pipeline.runAll(contexts);
  assertEquals(results.length, 2);
  assertEquals(s1.calls, 2);
});
