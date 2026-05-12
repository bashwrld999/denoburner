import { assertEquals, assert } from "@std/assert";
import { retry } from "../../src/core/retry.ts";

Deno.test("retry — succeeds on first attempt", async () => {
  const result = await retry(() => Promise.resolve(42));
  assertEquals(result, 42);
});

Deno.test("retry — retries on failure then succeeds", async () => {
  let attempts = 0;
  const result = await retry(() => {
    attempts++;
    if (attempts < 3) throw new Error("fail");
    return Promise.resolve("ok");
  }, { maxRetries: 3, baseDelayMs: 5 });
  assertEquals(result, "ok");
  assertEquals(attempts, 3);
});

Deno.test("retry — throws after exhausting retries", async () => {
  let attempts = 0;
  try {
    await retry(() => {
      attempts++;
      throw new Error("always fail");
    }, { maxRetries: 2, baseDelayMs: 5 });
    assert(false, "should have thrown");
  } catch (err) {
    assert(err instanceof Error);
    assertEquals(attempts, 3); // initial + 2 retries
  }
});

Deno.test("retry — linear backoff", async () => {
  const delays: number[] = [];
  const start = Date.now();
  try {
    await retry(() => {
      throw new Error("fail");
    }, { maxRetries: 2, baseDelayMs: 10, backoff: "linear" });
  } catch {
    const elapsed = Date.now() - start;
    assert(elapsed >= 30); // 10 + 20 = 30ms minimum
  }
});

Deno.test("retry — exponential backoff", async () => {
  const start = Date.now();
  try {
    await retry(() => {
      throw new Error("fail");
    }, { maxRetries: 2, baseDelayMs: 10, backoff: "exponential" });
  } catch {
    const elapsed = Date.now() - start;
    assert(elapsed >= 30); // 10 + 20 = 30ms minimum
  }
});

Deno.test("retry — onRetry callback fires", async () => {
  const errors: Error[] = [];
  let attempts = 0;
  try {
    await retry(() => {
      attempts++;
      throw new Error(`fail ${attempts}`);
    }, {
      maxRetries: 2,
      baseDelayMs: 5,
      onRetry: (_attempt, err) => errors.push(err),
    });
  } catch {
    assertEquals(errors.length, 2);
    assertEquals(errors[0].message, "fail 1");
    assertEquals(errors[1].message, "fail 2");
  }
});
