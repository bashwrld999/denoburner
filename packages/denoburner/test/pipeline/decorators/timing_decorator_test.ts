import { assertEquals } from "@std/assert";
import { TimingStageDecorator } from "../../../src/pipeline/decorators/timing_decorator.ts";
import type { PipelineStage, PipelineContext } from "../../../src/pipeline/types.ts";

Deno.test("TimingStageDecorator — logs elapsed time", async () => {
  let logged = "";
  const inner: PipelineStage = {
    name: "test_stage",
    async execute(ctx: PipelineContext) {
      ctx.gameServer = "home";
    },
  };

  const decorator = new TimingStageDecorator(inner, { info: (msg) => { logged = msg; } });

  const ctx: PipelineContext = {
    localPath: "/test.ts",
    gameServer: "",
    gameFilename: "test.ts",
    startedAt: Date.now(),
  };

  await decorator.execute(ctx);
  assertEquals(ctx.gameServer, "home");
  assertEquals(logged.includes("test_stage:"), true);
  assertEquals(logged.includes("ms"), true);
});

Deno.test("TimingStageDecorator — propagates inner stage errors", async () => {
  const inner: PipelineStage = {
    name: "failing",
    async execute() {
      throw new Error("inner fail");
    },
  };

  const decorator = new TimingStageDecorator(inner);

  let threw = false;
  try {
    await decorator.execute({} as PipelineContext);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
