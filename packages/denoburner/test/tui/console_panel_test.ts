import { assertEquals, assert } from "@std/assert";
import { ConsolePanel } from "../../src/tui/console_panel.ts";
import { DEFAULT_TUI_STATS } from "../../src/tui/defaults.ts";
import type { LogEntry, TuiStats, RenderContext } from "../../src/tui/interfaces.ts";

const NOW = new Date("2026-05-12T10:00:00");

function log(level: LogEntry["level"], msg: string, cat?: string): LogEntry {
  return { timestamp: NOW, level, message: msg, category: cat };
}

function makeCtx(statsOverrides?: Partial<TuiStats>, logsOverride?: LogEntry[], width = 80, height = 10): RenderContext {
  return {
    width,
    height,
    stats: { ...DEFAULT_TUI_STATS, ...statsOverrides },
    logs: logsOverride ?? [],
  };
}

Deno.test("ConsolePanel — renders exact height", () => {
  const panel = new ConsolePanel();
  const lines = panel.render(makeCtx());
  assertEquals(lines.length, 10);
});

Deno.test("ConsolePanel — renders log entries", () => {
  const panel = new ConsolePanel();
  const lines = panel.render(makeCtx({}, [log("info", "hello world")]));
  const hasMessage = lines.some((l) => l.includes("hello world"));
  assert(hasMessage, "should render log message");
});

Deno.test("ConsolePanel — filters by log level", () => {
  const panel = new ConsolePanel();
  const entries = [
    log("info", "info msg"),
    log("error", "error msg"),
    log("warn", "warn msg"),
  ];
  const lines = panel.render(makeCtx({ logLevelFilter: "error" }, entries));
  const hasError = lines.some((l) => l.includes("error msg"));
  const hasInfo = lines.some((l) => l.includes("info msg"));
  assert(hasError, "should show error messages");
  assertEquals(hasInfo, false, "should hide info messages");
});

Deno.test("ConsolePanel — help overlay", () => {
  const panel = new ConsolePanel();
  const entries = [log("info", "should not appear")];
  const ctx = makeCtx({}, entries);
  const lines = panel.render({ ...ctx, showHelp: true });
  const hasHelp = lines.some((l) => l.includes("denoburner"));
  const hasLog = lines.some((l) => l.includes("should not appear"));
  assert(hasHelp, "should show help content");
  assertEquals(hasLog, false, "should hide log content when help shown");
});

Deno.test("ConsolePanel — shows hidden count indicator", () => {
  const panel = new ConsolePanel();
  const entries = Array.from({ length: 100 }, (_, i) => log("info", `msg ${i}`));
  const ctx = makeCtx({ height: 5 }, entries);
  const lines = panel.render(ctx);
  const hasMore = lines.some((l) => l.includes("more"));
  assert(hasMore, "should show hidden count when logs truncated");
});



Deno.test("ConsolePanel — short messages fit on one line", () => {
  const panel = new ConsolePanel();
  const entries = [log("info", "hello world")];
  const ctx = makeCtx({}, entries, 80, 5);
  const lines = panel.render(ctx);
  assertEquals(lines.length, 5);
  const hasHello = lines.some((l) => l.includes("hello world"));
  assert(hasHello, "short message should appear on single line");
});

Deno.test("ConsolePanel — renders category tag when present", () => {
  const panel = new ConsolePanel();
  const entries = [log("success", "done", "Upload")];
  const lines = panel.render(makeCtx({}, entries));
  const hasCat = lines.some((l) => l.includes("Upload"));
  assert(hasCat, "should show category");
});
