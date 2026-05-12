/**
 * Console Panel Component
 * 
 * Displays log messages with timestamps and colored levels.
 */

import type { TuiComponent, RenderContext } from "./component.ts";
import type { LogLevel } from "../../logger/interfaces/index.ts";
import type { TuiState } from "../interfaces/state-store.ts";
import { colorize } from "../colors.ts";

/**
 * Console panel component - displays log messages
 */
export class ConsolePanel implements TuiComponent {
  readonly name = "ConsolePanel";

  render(context: RenderContext): string[] {
    const { logs, theme, width, height } = context;
    const state = context.state as TuiState | undefined;
    const logLevelFilter = state?.ui?.logLevelFilter ?? "all";
    
    const lines: string[] = [];
    
    // Filter logs based on level filter
    const filteredLogs = logLevelFilter === "all" 
      ? logs 
      : logs.filter(log => log.level === logLevelFilter);
    
    const visibleLogs = filteredLogs.slice(-height);

    for (const log of visibleLogs) {
      // Format time as HH:MM:SS.mmm
      const time = this.formatTime(log.timestamp);
      const coloredTime = colorize(time, "gray");

      // Format level and category with color based on log level
      const level = log.level.toUpperCase();
      const levelColor = this.getLogColor(log.level, theme);
      const coloredNameLevel = `[${colorize(`${log.category}/${level}`, levelColor)}]`;

      // Split log text by newlines first
      const textLines = log.message.split(/\r?\n/);

      // First line gets the formatted prefix
      const firstLine = `${coloredTime} ${coloredNameLevel} ${textLines[0]}`;
      const wrappedFirst = this.wrapText(firstLine, width);
      lines.push(...wrappedFirst);

      // Subsequent lines get indentation (no prefix)
      for (let i = 1; i < textLines.length; i++) {
        // Calculate indent: time (12) + space + [Category/LEVEL] (varies) + space
        const prefixLen = 12 + 1 + log.category.length + level.length + 3 + 1;
        const continuationLine = " ".repeat(prefixLen) + textLines[i];
        const wrappedCont = this.wrapText(continuationLine, width);
        lines.push(...wrappedCont);
      }
    }

    // Pad remaining lines
    while (lines.length < height) {
      lines.push("");
    }

    // Trim to height if we have too many lines
    return lines.slice(-height);
  }

  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const ms = String(date.getMilliseconds()).padStart(3, "0");
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  private getLogColor(level: LogLevel, theme: Record<string, string>): string {
    switch (level) {
      case "success":
        return theme.success || "green";
      case "error":
        return theme.error || "red";
      case "warn":
        return theme.warning || "yellow";
      case "debug":
        return "gray";
      default:
        return theme.info || "white";
    }
  }

  private wrapText(text: string, maxWidth: number): string[] {
    if (maxWidth <= 0) return [text];

    // Strip ANSI codes for length calculation
    const stripped = text.replace(/\x1b\[[0-9;]*m/g, "");
    if (stripped.length <= maxWidth) {
      return [text];
    }

    const lines: string[] = [];
    let currentLine = "";
    let currentLength = 0;
    let inAnsi = false;
    let ansiCode = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Handle ANSI escape codes
      if (char === "\x1b") {
        inAnsi = true;
        ansiCode = char;
        currentLine += char;
        continue;
      }

      if (inAnsi) {
        ansiCode += char;
        currentLine += char;
        if (char === "m") {
          inAnsi = false;
        }
        continue;
      }

      // Regular character
      currentLine += char;
      currentLength++;

      if (currentLength >= maxWidth) {
        lines.push(currentLine);
        currentLine = "";
        currentLength = 0;
      }
    }

    if (currentLength > 0) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [text];
  }
}
