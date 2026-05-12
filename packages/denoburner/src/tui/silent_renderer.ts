import type { ITuiRenderer, LogEntry, TuiStats } from "./interfaces.ts";
import { DEFAULT_TUI_STATS } from "./defaults.ts";

export class SilentRenderer implements ITuiRenderer {
  stats: TuiStats = { ...DEFAULT_TUI_STATS };

  start(): void {}
  stop(): void {}
  updateStats(_stats: TuiStats): void {}
  appendLog(_entry: LogEntry): void {}
  clearLogs(): void {}
  requestRender(): void {}
  cycleExpand(): void {}
  cycleFilter(): void {}
  cycleHelp(): void {}
}
