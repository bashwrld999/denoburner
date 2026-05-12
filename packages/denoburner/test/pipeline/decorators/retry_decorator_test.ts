import { assertEquals } from "@std/assert";
import { RetryStageDecorator } from "../../../src/pipeline/decorators/retry_decorator.ts";
import type { PipelineStage, PipelineContext } from "../../../src/pipeline/types.ts";

Deno.test("RetryStageDecorator — succeeds on first attempt", async () => {
  let attempts = 0;
  const inner: PipelineStage = {
    name: "test",
    async execute() { attempts++; },
  };

  const decorator = new RetryStageDecorator(inner, 3, 10);
  await decorator.execute({} as PipelineContext);
  assertEquals(attempts, 1);
});

Deno.test("RetryStageDecorator — retries on failure", async () => {
  let attempts = 0;
  const inner: PipelineStage = {
    name: "flaky",
    async execute() {
      attempts++;
      if (attempts < 3) throw new Error("transient");
    },
  };

  const decorator = new RetryStageDecorator(inner, 3, 10);
  await decorator.execute({} as PipelineContext);
  assertEquals(attempts, 3);
});

Deno.test("RetryStageDecorator — throws after exhausting retries", async () => {
  const inner: PipelineStage = {
    name: "always_fails",
    async execute() { throw new Error("permanent"); },
  };

  const decorator = new RetryStageDecorator(inner, 2, 10);
  let threw = false;
  try {
    await decorator.execute({} as PipelineContext);
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message, "permanent");
  }
  assertEquals(threw, true);
});

Deno.test("RetryStageDecorator — logs retry attempts", async () => {
  let warnings: string[] = [];
  const inner: PipelineStage = {
    name: "flaky",
    async execute() { throw new Error("oops"); },
  };

  const decorator = new RetryStageDecorator(inner, 1, 10, {
    warn: (msg) => { warnings.push(msg); },
  });

  try { await decorator.execute({} as PipelineContext); } catch {}

  assertEquals(warnings.length, 1);
  assertEquals(warnings[0].includes("flaky"), true);
  assertEquals(warnings[0].includes("Retrying"), true);
});
