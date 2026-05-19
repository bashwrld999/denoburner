import { assertEquals, assert } from "@std/assert";
import { StatsPanel } from "../../src/tui/stats_panel.ts";
import { DEFAULT_TUI_STATS } from "../../src/tui/defaults.ts";
import type { TuiStats, RenderContext } from "../../src/tui/interfaces.ts";

function makeCtx(overrides?: Partial<TuiStats>): RenderContext {
  return {
    width: 80,
    height: 24,
    stats: { ...DEFAULT_TUI_STATS, ...overrides },
    logs: [],
  };
}

Deno.test("StatsPanel — renders exact height", () => {
  const panel = new StatsPanel();
  const lines = panel.render(makeCtx());
  assertEquals(lines.length, 24);
});

Deno.test("StatsPanel — connected state shows green indicator", () => {
  const panel = new StatsPanel();
  const lines = panel.render(makeCtx({ status: "connected", uptimeSeconds: 42 }));
  const connLine = lines.find((l) => l.includes("Connected"));
  assert(connLine, "should show connected status");
  assert(connLine!.includes("\u25cf"), "should show dot indicator");
});

Deno.test("StatsPanel — disconnected state shows red indicator", () => {
  const panel = new StatsPanel();
  const lines = panel.render(makeCtx({ status: "disconnected" }));
  const connLine = lines.find((l) => l.includes("Disconnected"));
  assert(connLine, "should show disconnected status");
});

Deno.test("StatsPanel — waiting state shows dot animation", () => {
  const panel = new StatsPanel();
  const lines = panel.render(makeCtx({ status: "waiting" }));
  const waitLine = lines.find((l) => l.includes("Waiting"));
  assert(waitLine, "should show waiting status");
});

Deno.test("StatsPanel — upload counts displayed", () => {
  const panel = new StatsPanel();
  const lines = panel.render(makeCtx({ filesUploaded: 10, errors: 2, skipCount: 3 }));
  const uploadLine = lines.find((l) => l.includes("\u2713") && l.includes("\u2717"));
  assert(uploadLine, "should show uploads with checkmark and error symbols");
  assert(uploadLine!.includes("10"), "should show upload count");
  assert(uploadLine!.includes("2"), "should show error count");
  assert(uploadLine!.includes("3"), "should show skip count");
});

Deno.test("StatsPanel — server list renders with expansion", () => {
  const servers = new Map();
  servers.set("home", [{ name: "hack.ts", ram: 1.6 }]);
  servers.set("n00dles", [{ name: "early.ts", ram: 0.4 }]);
  const expanded = new Set<string>(["home"]);
  const panel = new StatsPanel();
  const lines = panel.render(makeCtx({ servers, expandedServers: expanded }));
  assertEquals(lines.length, 24);
  const hasHome = lines.some((l) => l.includes("home"));
  assert(hasHome, "should render home server");
});

Deno.test("StatsPanel — queue stats shown when non-zero", () => {
  const panel = new StatsPanel();
  const lines = panel.render(makeCtx({ queuePending: 3, queueFailed: 1 }));
  const queueLine = lines.find((l) => l.includes("Queue"));
  assert(queueLine, "should show queue stats");
  assert(queueLine!.includes("3"), "should show pending count");
});

Deno.test("StatsPanel — status bar always present", () => {
  const panel = new StatsPanel();
  const lines = panel.render(makeCtx());
  const statusLine = lines.find((l) => l.includes("[Q]") && l.includes("[C]"));
  assert(statusLine, "should show status bar with keybinds");
});

Deno.test("StatsPanel — total stats row present", () => {
  const panel = new StatsPanel();
  const lines = panel.render(makeCtx({ totalRam: 12.5 }));
  const totalLine = lines.find((l) => l.includes("Total:"));
  assert(totalLine, "should show total stats");
  assert(totalLine!.includes("12.50"), "should show RAM total");
  assert(totalLine!.includes("GB"), "should show GB unit");
});
