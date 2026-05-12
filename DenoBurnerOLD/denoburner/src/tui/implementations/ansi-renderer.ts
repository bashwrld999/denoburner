/**
 * ANSI Renderer Implementation
 * 
 * Strategy pattern for terminal rendering using ANSI escape codes.
 */

import type { Renderer, ColorName, TextStyle } from "../interfaces/index.ts";
import type { LogLevel } from "../../logger/interfaces/index.ts";

/**
 * ANSI escape codes
 */
const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  inverse: "\x1b[7m",
  clear: "\x1b[2J",
  clearLine: "\x1b[2K",
  home: "\x1b[H",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  altScreen: "\x1b[?1049h",
  mainScreen: "\x1b[?1049l",
};

/**
 * ANSI color codes
 */
const COLORS: Record<ColorName, string> = {
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
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",
};

/**
 * Log level colors
 */
const LEVEL_COLORS: Record<LogLevel, ColorName> = {
  debug: "gray",
  info: "white",
  warn: "yellow",
  error: "red",
  success: "green",
};

/**
 * ANSI Renderer
 * 
 * Renders to a real terminal using ANSI escape codes.
 */
export class AnsiRenderer implements Renderer {
  private encoder = new TextEncoder();

  init(): void {
    this.enableAlternateBuffer();
    this.clear();
    this.hideCursor();
  }

  cleanup(): void {
    this.showCursor();
    this.disableAlternateBuffer();
  }

  clear(): void {
    Deno.stdout.writeSync(this.encoder.encode(ANSI.clear + ANSI.home));
  }

  moveCursor(x: number, y: number): void {
    // ANSI uses 1-based coordinates
    Deno.stdout.writeSync(this.encoder.encode(`\x1b[${y + 1};${x + 1}H`));
  }

  write(text: string): void {
    Deno.stdout.writeSync(this.encoder.encode(text));
  }

  writeLine(text: string): void {
    Deno.stdout.writeSync(this.encoder.encode(text + "\n"));
  }

  writeColored(text: string, color: ColorName, style?: TextStyle): void {
    let output = "";

    // Apply style
    if (style?.bold) output += ANSI.bold;
    if (style?.dim) output += ANSI.dim;
    if (style?.italic) output += ANSI.italic;
    if (style?.underline) output += ANSI.underline;
    if (style?.inverse) output += ANSI.inverse;

    // Apply color
    output += COLORS[color] ?? "";
    output += text;
    output += ANSI.reset;

    Deno.stdout.writeSync(this.encoder.encode(output));
  }

  resetFormatting(): void {
    Deno.stdout.writeSync(this.encoder.encode(ANSI.reset));
  }

  render(lines: string[]): void {
    // Move cursor to top-left and render all lines
    const output = ANSI.home + lines.join("\r\n");
    Deno.stdout.writeSync(this.encoder.encode(output));
  }

  getSize(): { width: number; height: number } {
    try {
      const size = Deno.consoleSize();
      return {
        width: Math.max(80, size.columns),
        height: Math.max(24, size.rows),
      };
    } catch {
      return { width: 120, height: 30 };
    }
  }

  hideCursor(): void {
    Deno.stdout.writeSync(this.encoder.encode(ANSI.hideCursor));
  }

  showCursor(): void {
    Deno.stdout.writeSync(this.encoder.encode(ANSI.showCursor));
  }

  enableAlternateBuffer(): void {
    Deno.stdout.writeSync(this.encoder.encode(ANSI.altScreen));
  }

  disableAlternateBuffer(): void {
    Deno.stdout.writeSync(this.encoder.encode(ANSI.mainScreen));
  }

  getLevelColor(level: LogLevel): ColorName {
    return LEVEL_COLORS[level];
  }
}

/**
 * Create an ANSI renderer
 */
export function createAnsiRenderer(): Renderer {
  return new AnsiRenderer();
}
