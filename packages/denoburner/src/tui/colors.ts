import type { LogEntry } from "./interfaces.ts";

// Foreground
export const fg = {
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
};

// Background
export const bg = {
  red: "\x1b[41m",
  green: "\x1b[42m",
  white: "\x1b[47m",
};

export const reset = "\x1b[0m";
export const bold = "\x1b[1m";
export const dim = "\x1b[2m";
export const underline = "\x1b[4m";

export type ThemeColor = keyof typeof fg;

export function colorize(text: string, color: string): string {
  return `${color}${text}${reset}`;
}

export function logLevelColor(level: LogEntry["level"]): string {
  switch (level) {
    case "success":
      return fg.brightGreen;
    case "error":
      return fg.brightRed;
    case "warn":
      return fg.brightYellow;
    case "info":
      return fg.brightBlue;
    case "debug":
      return fg.gray;
  }
}

export function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

export function visibleLen(s: string): number {
  return stripAnsi(s).length;
}

export function visiblePadEnd(s: string, len: number): string {
  const visLen = visibleLen(s);
  if (visLen >= len) return visibleSlice(s, len) + reset;
  return s + " ".repeat(len - visLen);
}

export function visibleSlice(s: string, max: number): string {
  let result = "";
  let visLen = 0;
  let i = 0;
  while (i < s.length && visLen < max) {
    if (s[i] === "\x1b") {
      const end = s.indexOf("m", i);
      if (end !== -1) {
        result += s.slice(i, end + 1);
        i = end + 1;
        continue;
      }
    }
    result += s[i];
    visLen++;
    i++;
  }
  return result;
}
