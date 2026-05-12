/**
 * Renderer Interface
 * 
 * Strategy pattern for terminal rendering.
 * Allows swapping between ANSI renderer (real terminal) and test renderer (for testing).
 */

import type { LogLevel } from "../../logger/interfaces/index.ts";

/**
 * Color names supported by the renderer
 */
export type ColorName =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray"
  | "brightRed"
  | "brightGreen"
  | "brightYellow"
  | "brightBlue"
  | "brightMagenta"
  | "brightCyan"
  | "brightWhite";

/**
 * Text style options
 */
export interface TextStyle {
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  inverse?: boolean;
}

/**
 * Renderer Interface
 * 
 * Abstracts terminal rendering operations.
 */
export interface Renderer {
  /**
   * Initialize the renderer
   */
  init(): void;

  /**
   * Clean up the renderer
   */
  cleanup(): void;

  /**
   * Clear the screen
   */
  clear(): void;

  /**
   * Move cursor to position
   */
  moveCursor(x: number, y: number): void;

  /**
   * Write text at current cursor position
   */
  write(text: string): void;

  /**
   * Write a line (with newline)
   */
  writeLine(text: string): void;

  /**
   * Write colored text
   */
  writeColored(text: string, color: ColorName, style?: TextStyle): void;

  /**
   * Reset all formatting
   */
  resetFormatting(): void;

  /**
   * Render multiple lines (moves cursor to top-left first)
   */
  render(lines: string[]): void;

  /**
   * Get terminal size
   */
  getSize(): { width: number; height: number };

  /**
   * Hide cursor
   */
  hideCursor(): void;

  /**
   * Show cursor
   */
  showCursor(): void;

  /**
   * Switch to alternate screen buffer
   */
  enableAlternateBuffer(): void;

  /**
   * Switch back to main screen buffer
   */
  disableAlternateBuffer(): void;

  /**
   * Get color for log level
   */
  getLevelColor(level: LogLevel): ColorName;
}

/**
 * Render context passed to components
 */
export interface RenderContext {
  /** Available width */
  width: number;
  /** Available height */
  height: number;
  /** Theme colors */
  theme: Record<string, string>;
  /** Renderer instance */
  renderer: Renderer;
}
