import type { ITuiRenderer, LogEntry, TuiStats } from "./interfaces.ts";
import { DEFAULT_TUI_STATS } from "./defaults.ts";
import { StatsPanel } from "./stats_panel.ts";
import { ConsolePanel } from "./console_panel.ts";
import { SplitLayout } from "./split_layout.ts";

const ANSI = {
  home: "\x1b[H",
  altScreen: "\x1b[?1049h",
  mainScreen: "\x1b[?1049l",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
};

type OnShutdown = () => void;

export class AnsiRenderer implements ITuiRenderer {
  private running = false;
  private showHelp = false;
  stats: TuiStats = { ...DEFAULT_TUI_STATS };
  logBuffer: LogEntry[] = [];
  private maxLogLines = 500;
  private layout: SplitLayout;
  private onShutdown: OnShutdown = () => {};
  private renderTimer = 0;
  private uptimeTimer = 0;

  constructor(onShutdown?: OnShutdown) {
    if (onShutdown) this.onShutdown = onShutdown;
    const statsPanel = new StatsPanel();
    const consolePanel = new ConsolePanel();
    this.layout = new SplitLayout(statsPanel, consolePanel, 0.20);
  }

  start(): void {
    this.running = true;
    const enc = new TextEncoder();
    Deno.stdout.writeSync(enc.encode(ANSI.altScreen));
    Deno.stdout.writeSync(enc.encode(ANSI.hideCursor));
    this.render();
    this.startRenderLoop();
    this.startUptimeTick();
    this.listenForResize();
  }

  stop(): void {
    this.running = false;
    clearTimeout(this.renderTimer);
    clearInterval(this.uptimeTimer);
    this.removeResizeListener();
    const enc = new TextEncoder();
    Deno.stdout.writeSync(enc.encode(ANSI.showCursor));
    Deno.stdout.writeSync(enc.encode(ANSI.mainScreen));
  }

  updateStats(stats: TuiStats): void {
    this.stats = stats;
  }

  appendLog(entry: LogEntry): void {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxLogLines) {
      this.logBuffer = this.logBuffer.slice(-this.maxLogLines);
    }
  }

  clearLogs(): void {
    this.logBuffer = [];
  }

  cycleExpand(): void {
    const entries = [...this.stats.servers.entries()].sort(([a], [b]) => {
      if (a === "home") return -1;
      if (b === "home") return 1;
      return a.localeCompare(b);
    });
    const s = this.stats.expandedServers;
    if (s.size === 0) {
      s.add(entries[0]?.[0] ?? "home");
    } else if (s.size >= entries.length) {
      s.clear();
    } else {
      for (const [name] of entries) {
        if (!s.has(name)) { s.add(name); break; }
      }
    }
  }

  cycleFilter(): void {
    const cycle = ["all", "error", "warn", "info", "success", "debug"];
    const idx = cycle.indexOf(this.stats.logLevelFilter);
    this.stats.logLevelFilter = cycle[(idx + 1) % cycle.length];
  }

  requestRender(): void {
    this.render();
  }

  cycleHelp(): void {
    this.showHelp = !this.showHelp;
  }

  private render(): void {
    if (!this.running) return;
    const { columns, rows } = this.getTerminalSize();
    if (columns < 60 || rows < 10) return;

    const lines = this.layout.render({
      width: columns,
      height: rows,
      stats: this.stats,
      logs: this.logBuffer,
      showHelp: this.showHelp,
    });

    const output = ANSI.home + lines.join("\r\n");
    Deno.stdout.writeSync(new TextEncoder().encode(output));
  }

  private startRenderLoop(): void {
    const loop = () => {
      if (!this.running) return;
      this.render();
      this.renderTimer = setTimeout(loop, 200);
    };
    loop();
  }

  private startUptimeTick(): void {
    this.uptimeTimer = setInterval(() => {
      if (!this.running) return;
      this.stats.uptimeSeconds++;
    }, 1000);
  }

  private getTerminalSize(): { columns: number; rows: number } {
    try {
      const size = Deno.consoleSize();
      return { columns: Math.max(80, size.columns), rows: Math.max(24, size.rows) };
    } catch {
      return { columns: 80, rows: 24 };
    }
  }

  private listenForResize(): void {
    try {
      Deno.addSignalListener("SIGWINCH", () => {
        if (this.running) this.render();
      });
    } catch {
      // SIGWINCH not available
    }
  }

  private removeResizeListener(): void {
    try {
      Deno.removeSignalListener("SIGWINCH", () => {});
    } catch {
      // not registered
    }
  }
}
