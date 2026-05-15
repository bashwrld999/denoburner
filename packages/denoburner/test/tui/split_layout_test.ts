import { assertEquals, assert } from "@std/assert";
import { SplitLayout } from "../../src/tui/split_layout.ts";
import { StatsPanel } from "../../src/tui/stats_panel.ts";
import { ConsolePanel } from "../../src/tui/console_panel.ts";
import { DEFAULT_TUI_STATS } from "../../src/tui/defaults.ts";
import type { ITuiComponent, RenderContext } from "../../src/tui/interfaces.ts";

class FixedPanel implements ITuiComponent {
  constructor(private content: string[]) {}
  render(_ctx: RenderContext): string[] {
    return this.content;
  }
}

Deno.test("SplitLayout — renders top border + content + bottom border", () => {
  const left = new FixedPanel(["content"]);
  const right = new FixedPanel(["content"]);
  const layout = new SplitLayout(left, right, 0.3);
  const lines = layout.render({
    width: 80,
    height: 24,
    stats: { ...DEFAULT_TUI_STATS },
    logs: [],
  });
  // 1 (top border) + 1 (content) + 1 (bottom border) = 3
  assertEquals(lines.length, 3);
});

Deno.test("SplitLayout — has top and bottom borders", () => {
  const left = new FixedPanel(["a"]);
  const right = new FixedPanel(["b"]);
  const layout = new SplitLayout(left, right, 0.3);
  const lines = layout.render({
    width: 80,
    height: 10,
    stats: { ...DEFAULT_TUI_STATS },
    logs: [],
  });
  // First line should have top-left corner
  assert(lines[0].includes("\u250c"), "top border should have left corner");
  // Last line should have bottom-left corner
  assert(lines[lines.length - 1].includes("\u2514"), "bottom border should have left corner");
});

Deno.test("SplitLayout — renders section titles", () => {
  const left = new FixedPanel(["a"]);
  const right = new FixedPanel(["b"]);
  const layout = new SplitLayout(left, right, 0.3);
  const lines = layout.render({
    width: 80,
    height: 10,
    stats: { ...DEFAULT_TUI_STATS },
    logs: [],
  });
  assert(lines[0].includes("STATS"), "should show STATS title");
  assert(lines[0].includes("CONSOLE"), "should show CONSOLE title");
});

Deno.test("SplitLayout — uses proportional width", () => {
  const left = new FixedPanel(["a".repeat(19)]); // 19 vis chars (floor(77*0.25))
  const right = new FixedPanel(["b".repeat(58)]);
  const layout = new SplitLayout(left, right, 0.25);
  const lines = layout.render({
    width: 80,
    height: 10,
    stats: { ...DEFAULT_TUI_STATS },
    logs: [],
  });
  // Content line has: border(1) + left(19) + mid(1) + right(58) + border(1) = 80
  // Plus ANSI color codes, so actual length > 80 when including escape codes
  assert(lines[1].includes("a".repeat(19)), "left panel content visible");
  assert(lines[1].includes("b".repeat(58)), "right panel content visible");
});
