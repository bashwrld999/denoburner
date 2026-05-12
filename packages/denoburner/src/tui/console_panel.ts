import type { ITuiComponent, RenderContext, LogEntry } from "./interfaces.ts";
import { fg, reset, bold, logLevelColor, dim, stripAnsi, visiblePadEnd, visibleSlice } from "./colors.ts";

const HELP_KEYS = [
  `${fg.gray}[Q]${reset}     Quit the tool`,
  `${fg.gray}[C]${reset}     Clear the console log`,
  `${fg.gray}[E]${reset}     Cycle server file list expansion`,
  `${fg.gray}[L]${reset}     Cycle log level filter`,
  `${fg.gray}[?]${reset}     Toggle this help screen`,
];

const HELP_NOTES = [
  `${dim}Connect${reset}    Bitburner connects TO this tool via WebSocket`,
  `${dim}Upload${reset}     Files are pushed to the game on change`,
  `${dim}Cascade${reset}    Dependencies re-upload dependent files`,
  `${dim}Cache${reset}      Unchanged files skipped via content hash`,
];

function buildHelpContent(width: number): string[] {
  // Index ranges in the raw array
  const titleIdx = new Set([1, 9, 16]);
  const keyStart = 3;
  const keyEnd = keyStart + HELP_KEYS.length; // 8
  const noteStart = 11;
  const noteEnd = noteStart + HELP_NOTES.length; // 15

  const raw: string[] = [
    "",
    `${fg.white}${bold}denoburner${reset}`,
    "",
    ...HELP_KEYS,
    "",
    `${fg.white}How it works${reset}`,
    "",
    ...HELP_NOTES,
    "",
    `Press ${fg.gray}[?]${reset} or ${fg.gray}[Q]${reset} to close`,
  ];

  const keysW = Math.max(...HELP_KEYS.map((l) => stripAnsi(l).length));
  const notesW = Math.max(...HELP_NOTES.map((l) => stripAnsi(l).length));

  return raw.map((l, i) => {
    if (!l) return "";
    if (titleIdx.has(i)) {
      const pad = Math.max(0, Math.round((width - stripAnsi(l).length) / 2));
      return " ".repeat(pad) + l;
    }
    if (i >= keyStart && i < keyEnd) {
      const pad = Math.max(0, Math.round((width - keysW) / 2));
      return " ".repeat(pad) + visiblePadEnd(l, keysW);
    }
    if (i >= noteStart && i < noteEnd) {
      const pad = Math.max(0, Math.round((width - notesW) / 2));
      return " ".repeat(pad) + visiblePadEnd(l, notesW);
    }
    return l;
  });
}

export class ConsolePanel implements ITuiComponent {
  render(ctx: RenderContext): string[] {
    const { width, height, logs, stats } = ctx;

    if (ctx.showHelp) {
      return this.renderHelp(width, height);
    }

    const filter = stats.logLevelFilter;

    const filtered = filter === "all"
      ? logs
      : logs.filter((l: LogEntry) => l.level === filter);

    const lines: string[] = [];
    const totalFiltered = filtered.length;
    const available = Math.min(totalFiltered, height);

    for (let i = totalFiltered - available; i < totalFiltered; i++) {
      if (lines.length >= height) break;
      const entry = filtered[i];
      const prefixLen = this.measurePrefix(entry);
      const messageWidth = width - prefixLen;
      const formatted = this.renderLine(entry);
      const wrapped = this.wrapWords(formatted, messageWidth, " ".repeat(prefixLen));
      for (const line of wrapped) {
        if (lines.length >= height) break;
        lines.push(line);
      }
    }

    const hiddenCount = totalFiltered - available;
    if (hiddenCount > 0) {
      const indicator = ` ${dim}\u2500 \u2500 \u2500 ${hiddenCount} more \u2500 \u2500 \u2500${reset}`;
      if (lines.length < height) {
        lines.push(visiblePadEnd(indicator, width));
      } else {
        lines[lines.length - 1] = visiblePadEnd(indicator, width);
      }
    }

    while (lines.length < height) {
      lines.push("");
    }

    return lines.slice(-height);
  }

  private renderHelp(width: number, height: number): string[] {
    const content = buildHelpContent(width);
    const lines: string[] = [];
    const padding = Math.max(0, Math.floor((height - content.length) / 2));
    for (let y = 0; y < padding; y++) lines.push("");
    for (const line of content) lines.push(line);
    while (lines.length < height) lines.push("");
    return lines;
  }

  private renderLine(entry: LogEntry): string {
    const ts = this.formatTimestamp(entry.timestamp);
    const level = entry.level.toUpperCase();
    const cat = entry.category ?? level;
    const catColor = logLevelColor(entry.level);
    const catStr = `${fg.white}[${reset}${catColor}${cat}/${level}${reset}${fg.white}]${reset}`;
    return `${dim}${ts}${reset} ${catStr} ${entry.message}`;
  }

  private formatTimestamp(d: Date): string {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${hh}:${mm}:${ss}.${ms}`;
  }

  private measurePrefix(entry: LogEntry): number {
    const cat = entry.category ?? entry.level.toUpperCase();
    const level = entry.level.toUpperCase();
    return 12 + 3 + cat.length + level.length + 2;
  }

  private wrapWords(text: string, maxWidth: number, prefix: string): string[] {
    const result: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      const plainLen = stripAnsi(remaining).length;
      if (plainLen <= maxWidth) {
        result.push(remaining);
        break;
      }

      const visible = visibleSlice(remaining, maxWidth);
      const plain = stripAnsi(visible);
      const lastSpace = plain.lastIndexOf(" ");

      if (lastSpace > 0) {
        result.push(visibleSlice(remaining, lastSpace));
        remaining = prefix + remaining.slice(stripAnsi(visibleSlice(remaining, lastSpace)).length + 1);
      } else {
        result.push(visible);
        remaining = prefix + remaining.slice(stripAnsi(visible).length);
      }

      if (result.length >= 20) break;
    }

    return result;
  }

}
