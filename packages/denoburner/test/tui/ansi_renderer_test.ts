import { assertEquals, assert } from "@std/assert";
import { AnsiRenderer } from "../../src/tui/ansi_renderer.ts";
import type { LogEntry } from "../../src/tui/interfaces.ts";

Deno.test("AnsiRenderer — initial stats are default", () => {
  const renderer = new AnsiRenderer();
  assertEquals(renderer.stats.status, "waiting");
  assertEquals(renderer.stats.filesUploaded, 0);
  assertEquals(renderer.stats.errors, 0);
});

Deno.test("AnsiRenderer — appendLog stores entries", () => {
  const renderer = new AnsiRenderer();
  const entry: LogEntry = { timestamp: new Date(), level: "info", message: "test" };
  renderer.appendLog(entry);
  assertEquals(renderer.logBuffer.length, 1);
  assertEquals(renderer.logBuffer[0].message, "test");
});

Deno.test("AnsiRenderer — clearLogs empties buffer", () => {
  const renderer = new AnsiRenderer();
  renderer.appendLog({ timestamp: new Date(), level: "info", message: "test" });
  renderer.clearLogs();
  assertEquals(renderer.logBuffer.length, 0);
});

Deno.test("AnsiRenderer — cycleFilter cycles through levels", () => {
  const renderer = new AnsiRenderer();
  assertEquals(renderer.stats.logLevelFilter, "all");
  renderer.cycleFilter();
  assertEquals(renderer.stats.logLevelFilter, "error");
  renderer.cycleFilter();
  assertEquals(renderer.stats.logLevelFilter, "warn");
});

Deno.test("AnsiRenderer — cycleExpand adds server to expanded set", () => {
  const renderer = new AnsiRenderer();
  assertEquals(renderer.stats.expandedServers.size, 0);
  // First call adds fallback "home" even with no entries
  renderer.cycleExpand();
  assertEquals(renderer.stats.expandedServers.size, 1);
  assert(renderer.stats.expandedServers.has("home"));
  // Second call with same single entry clears it
  renderer.cycleExpand();
  assertEquals(renderer.stats.expandedServers.size, 0);
});

Deno.test("AnsiRenderer — cycleHelp toggles help", () => {
  const renderer = new AnsiRenderer();
  // We can't easily check showHelp as it's private,
  // but we can verify it doesn't throw
  renderer.cycleHelp();
  renderer.cycleHelp();
});

Deno.test("AnsiRenderer — log buffer caps at 500", () => {
  const renderer = new AnsiRenderer();
  for (let i = 0; i < 600; i++) {
    renderer.appendLog({ timestamp: new Date(), level: "info", message: `msg ${i}` });
  }
  assertEquals(renderer.logBuffer.length, 500);
  assertEquals(renderer.logBuffer[0].message, "msg 100");
});
