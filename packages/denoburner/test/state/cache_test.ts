import { assertEquals } from "@std/assert";
import { FileCache } from "../../src/state/cache.ts";

Deno.test("FileCache — needsUpload returns true for new file", async () => {
  const cache = new FileCache();
  const f = await Deno.makeTempFile({ suffix: ".ts" });
  await Deno.writeTextFile(f, "const x = 1;");
  assertEquals(await cache.needsUpload(f, "home", "test.ts"), true);
  await Deno.remove(f);
});

Deno.test("FileCache — needsUpload returns false for unchanged file", async () => {
  const cache = new FileCache();
  const f = await Deno.makeTempFile({ suffix: ".ts" });
  await Deno.writeTextFile(f, "const x = 1;");
  await cache.markUploaded(f, "home", "test.ts", "const x = 1;");
  assertEquals(await cache.needsUpload(f, "home", "test.ts"), false);
  await Deno.remove(f);
});

Deno.test("FileCache — needsUpload returns true for changed file", async () => {
  const cache = new FileCache();
  const f = await Deno.makeTempFile({ suffix: ".ts" });
  await Deno.writeTextFile(f, "const x = 1;");
  await cache.markUploaded(f, "home", "test.ts", "const x = 1;");
  await Deno.writeTextFile(f, "const x = 2;");
  assertEquals(await cache.needsUpload(f, "home", "test.ts"), true);
  await Deno.remove(f);
});

Deno.test("FileCache — returns true on read error", async () => {
  const cache = new FileCache();
  assertEquals(await cache.needsUpload("/nonexistent/file.ts", "home", "f.ts"), true);
});

Deno.test("FileCache — markUploaded and needsUpload", async () => {
  const cache = new FileCache();
  const f = await Deno.makeTempFile({ suffix: ".ts" });
  await Deno.writeTextFile(f, "hi");
  await cache.markUploaded(f, "home", "f.ts", "hi");
  assertEquals(await cache.needsUpload(f, "home", "f.ts"), false);
  await Deno.remove(f);
});

Deno.test("FileCache — remove", async () => {
  const cache = new FileCache();
  await cache.markUploaded("p", "home", "f.ts", "c");
  assertEquals(cache.remove("p", "home"), true);
  assertEquals(cache.remove("p", "home"), false);
});

Deno.test("FileCache — clear", async () => {
  const cache = new FileCache();
  await cache.markUploaded("a", "home", "a.ts", "1");
  await cache.markUploaded("b", "home", "b.ts", "2");
  cache.clear();
  assertEquals(cache.getStats().entries, 0);
});

Deno.test("FileCache — hash consistency", async () => {
  const cache = new FileCache();
  const h1 = await cache.hash("hello");
  const h2 = await cache.hash("hello");
  assertEquals(h1, h2);
  assertEquals(typeof h1, "string");
  assertEquals(h1.length, 64); // SHA-256 hex
});
