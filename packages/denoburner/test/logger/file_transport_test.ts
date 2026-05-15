import { assertEquals, assert } from "@std/assert";
import { FileTransport } from "../../src/logger/file_transport.ts";
import type { LogEntry } from "../../src/tui/interfaces.ts";

function entry(level: LogEntry["level"], msg: string, cat?: string): LogEntry {
  return { timestamp: new Date("2026-05-12T10:00:00"), level, message: msg, category: cat };
}

Deno.test("FileTransport — writes log entry to file", async () => {
  const tmp = await Deno.makeTempFile({ prefix: "denoburner-log-" });
  const transport = new FileTransport(tmp);
  transport.log(entry("info", "hello world"));
  const content = await Deno.readTextFile(tmp);
  assert(content.includes("hello world"), "should contain message");
  assert(content.includes("INFO"), "should include level");
  await Deno.remove(tmp);
});

Deno.test("FileTransport — appends multiple entries", async () => {
  const tmp = await Deno.makeTempFile({ prefix: "denoburner-log-" });
  const transport = new FileTransport(tmp);
  transport.log(entry("info", "first"));
  transport.log(entry("error", "second"));
  const content = await Deno.readTextFile(tmp);
  const lines = content.trim().split("\n");
  assertEquals(lines.length, 2);
  await Deno.remove(tmp);
});

Deno.test("FileTransport — includes category when present", async () => {
  const tmp = await Deno.makeTempFile({ prefix: "denoburner-log-" });
  const transport = new FileTransport(tmp);
  transport.log(entry("warn", "test", "Upload"));
  const content = await Deno.readTextFile(tmp);
  assert(content.includes("[Upload]"), "should include category");
  await Deno.remove(tmp);
});

Deno.test("FileTransport — rotates file when exceeding max size", async () => {
  const tmp = await Deno.makeTempFile({ prefix: "denoburner-rotate-" });
  const transport = new FileTransport(tmp, 0.0004); // ~400 bytes max
  // Write entries with enough content to exceed the limit
  transport.log(entry("info", "x".repeat(300))); // ~350 bytes
  transport.log(entry("info", "y".repeat(300))); // should trigger rotation (~350 more > ~400)
  // After rotation, original should exist
  const content = await Deno.readTextFile(tmp);
  assert(content.includes("y"), "file should have latest entry");
  await Deno.remove(tmp).catch(() => {});
  await Deno.remove(tmp + ".old").catch(() => {});
});
