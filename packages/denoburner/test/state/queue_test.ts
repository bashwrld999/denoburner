import { assertEquals } from "@std/assert";
import { UploadQueueManager } from "../../src/state/queue.ts";

Deno.test("UploadQueueManager — enqueue and process", async () => {
  const queue = new UploadQueueManager();
  let processed = false;
  queue.setProcessor(async () => { processed = true; return true; });
  queue.enqueue({ filePath: "a.ts", content: "", gameServer: "home", gameFilename: "a.ts" });
  await delay(50);
  assertEquals(processed, true);
});

Deno.test("UploadQueueManager — retries on failure", async () => {
  const queue = new UploadQueueManager({ maxRetries: 1, baseDelayMs: 10 });
  let attempts = 0;
  queue.setProcessor(async () => { attempts++; throw new Error("fail"); });
  queue.enqueue({ filePath: "a.ts", content: "", gameServer: "home", gameFilename: "a.ts" });
  await delay(100);
  assertEquals(attempts, 2); // initial + 1 retry
});

Deno.test("UploadQueueManager — offline mode prevents processing", async () => {
  const queue = new UploadQueueManager();
  let processed = false;
  queue.setOffline(true);
  queue.setProcessor(async () => { processed = true; return true; });
  queue.enqueue({ filePath: "a.ts", content: "", gameServer: "home", gameFilename: "a.ts" });
  await delay(50);
  assertEquals(processed, false);
});

Deno.test("UploadQueueManager — retryAllFailed moves failed items back", async () => {
  const queue = new UploadQueueManager({ maxRetries: 0, baseDelayMs: 10 });
  queue.setProcessor(async () => { throw new Error("fail"); });
  queue.enqueue({ filePath: "a.ts", content: "", gameServer: "home", gameFilename: "a.ts" });
  await delay(50);
  const before = queue.getStats();
  assertEquals(before.failed, 1);
  queue.retryAllFailed();
  const after = queue.getStats();
  assertEquals(after.failed, 0);
  // pending should have item now (but with retries=0)
});

Deno.test("UploadQueueManager — stop cancels timers", async () => {
  const queue = new UploadQueueManager({ maxRetries: 5, baseDelayMs: 10 });
  queue.setProcessor(async () => { throw new Error("fail"); });
  queue.enqueue({ filePath: "a.ts", content: "", gameServer: "home", gameFilename: "a.ts" });
  // Wait for initial attempt and retry timer to be scheduled
  await delay(50);
  queue.stop();
  // Verify no pending items — timer was cancelled before item was re-enqueued
  const stats = queue.getStats();
  assertEquals(stats.pending, 0);
  // Verify stop can be called multiple times safely
  queue.stop();
});

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
