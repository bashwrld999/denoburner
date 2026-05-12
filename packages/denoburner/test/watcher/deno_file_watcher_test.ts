import { assertEquals } from "@std/assert";
import { DenoFileWatcher } from "../../src/watcher/deno_file_watcher.ts";

Deno.test("DenoFileWatcher — can be created and stopped", () => {
  const w = new DenoFileWatcher();
  // Should not throw
  w.close();
});

Deno.test("DenoFileWatcher — watch with empty paths does nothing", () => {
  const w = new DenoFileWatcher();
  let called = false;
  w.onChange(() => { called = true; });
  w.watch([]);
  w.close();
  assertEquals(called, false);
});

Deno.test("DenoFileWatcher — multiple close calls are safe", () => {
  const w = new DenoFileWatcher();
  w.close();
  w.close();
  // Should not throw
});

Deno.test("DenoFileWatcher — onChange handler receives events", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "watcher-test-" });
  const filePath = tmpDir + "/test.ts";
  await Deno.writeTextFile(filePath, "hello");

  const w = new DenoFileWatcher(30);
  const events: Array<{ type: string; path: string }> = [];
  w.onChange((e) => events.push(e));

  w.watch([tmpDir], { exts: [".ts"] });

  // Modify the file to trigger a watcher event
  await Deno.writeTextFile(filePath, "world");
  await delay(200);

  w.close();
  assertEquals(events.length > 0, true);
  assertEquals(events.some((e) => e.path.includes("test.ts")), true);

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("DenoFileWatcher — ext filter skips non-matching files", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "watcher-test-" });
  const tsFile = tmpDir + "/test.ts";
  const txtFile = tmpDir + "/test.txt";
  await Deno.writeTextFile(tsFile, "hi");
  await Deno.writeTextFile(txtFile, "hi");

  const w = new DenoFileWatcher(30);
  const events: Array<{ type: string; path: string }> = [];
  w.onChange((e) => events.push(e));

  w.watch([tmpDir], { exts: [".ts"] });

  await Deno.writeTextFile(txtFile, "changed");
  await delay(200);

  w.close();
  assertEquals(events.some((e) => e.path.includes("test.txt")), false);

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("DenoFileWatcher — skip pattern filters files", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "watcher-test-" });
  const keepFile = tmpDir + "/keep.ts";
  const skipFile = tmpDir + "/skip.ts";
  await Deno.writeTextFile(keepFile, "hi");
  await Deno.writeTextFile(skipFile, "hi");

  const w = new DenoFileWatcher(30);
  const events: Array<{ type: string; path: string }> = [];
  w.onChange((e) => events.push(e));

  w.watch([tmpDir], { exts: [".ts"], skip: [/skip/] });

  await Deno.writeTextFile(keepFile, "changed1");
  await Deno.writeTextFile(skipFile, "changed2");
  await delay(200);

  w.close();
  assertEquals(events.some((e) => e.path.includes("keep.ts")), true);
  assertEquals(events.some((e) => e.path.includes("skip.ts")), false);

  await Deno.remove(tmpDir, { recursive: true });
});

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
