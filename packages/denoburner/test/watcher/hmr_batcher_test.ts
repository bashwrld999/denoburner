import { assertEquals } from "@std/assert";
import { HmrBatcher } from "../../src/watcher/hmr_batcher.ts";

Deno.test("HmrBatcher — batches multiple adds within delay", async () => {
  let batch: string[] | null = null;
  const b = new HmrBatcher(30, (files) => { batch = files; });
  b.add("a.ts");
  b.add("b.ts");
  b.add("c.ts");
  await delay(60);
  assertEquals(batch, ["a.ts", "b.ts", "c.ts"]);
});

Deno.test("HmrBatcher — deduplicates same file", async () => {
  let batch: string[] | null = null;
  const b = new HmrBatcher(30, (files) => { batch = files; });
  b.add("a.ts");
  b.add("a.ts");
  b.add("a.ts");
  await delay(60);
  assertEquals(batch, ["a.ts"]);
});

Deno.test("HmrBatcher — flush fires immediately", () => {
  let batch: string[] | null = null;
  const b = new HmrBatcher(1000, (files) => { batch = files; });
  b.add("a.ts");
  b.add("b.ts");
  b.flush();
  assertEquals(batch, ["a.ts", "b.ts"]);
});

Deno.test("HmrBatcher — stop clears pending", () => {
  let called = false;
  const b = new HmrBatcher(30, () => { called = true; });
  b.add("a.ts");
  b.stop();
  return delay(60).then(() => assertEquals(called, false));
});

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
