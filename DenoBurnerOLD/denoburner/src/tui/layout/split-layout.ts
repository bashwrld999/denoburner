/**
 * Split Layout Component
 * 
 * Arranges two components side by side with a configurable ratio.
 */

import type { TuiComponent, TuiLayout, RenderContext } from "../components/component.ts";
import { colorize } from "../colors.ts";

/**
 * Box drawing characters
 */
const box = {
  tl: "┌",
  tr: "┐",
  bl: "└",
  br: "┘",
  h: "─",
  v: "│",
  t: "┬",
  b: "┴",
  l: "├",
  r: "┤",
  x: "┼",
};

/**
 * Split layout - arranges two panels side by side
 */
export class SplitLayout implements TuiLayout {
  readonly name = "SplitLayout";
  private children: [TuiComponent, TuiComponent];

  constructor(
    left: TuiComponent,
    right: TuiComponent,
    private ratio: number = 0.3
  ) {
    this.children = [left, right];
  }

  add(component: TuiComponent): void {
    // Split layout has exactly two children
    throw new Error("SplitLayout does not support add(). Use constructor to set children.");
  }

  remove(component: TuiComponent): void {
    throw new Error("SplitLayout does not support remove().");
  }

  getChildren(): TuiComponent[] {
    return [...this.children];
  }

  render(context: RenderContext): string[] {
    const { width, height, theme } = context;
    
    // Calculate content widths (excluding borders)
    const contentWidth = width - 3; // 3 for borders
    const leftContentWidth = Math.floor(contentWidth * this.ratio);
    const rightContentWidth = contentWidth - leftContentWidth;

    // Create child contexts
    const leftContext: RenderContext = {
      ...context,
      width: leftContentWidth,
      height: height - 2, // -2 for top and bottom borders
    };
    const rightContext: RenderContext = {
      ...context,
      width: rightContentWidth,
      height: height - 2,
    };

    // Render children
    const leftLines = this.children[0].render(leftContext);
    const rightLines = this.children[1].render(rightContext);

    // Build output
    const lines: string[] = [];

    // Top border with titles
    const leftTitle = "STATS";
    const rightTitle = "CONSOLE";

    const leftPadding = Math.max(0, Math.floor((leftContentWidth - leftTitle.length) / 2));
    const leftRightPadding = Math.max(0, leftContentWidth - leftPadding - leftTitle.length);
    const leftTitleLine = box.h.repeat(leftPadding) + leftTitle + box.h.repeat(leftRightPadding);

    const rightPadding = Math.max(0, Math.floor((rightContentWidth - rightTitle.length) / 2));
    const rightRightPadding = Math.max(0, rightContentWidth - rightPadding - rightTitle.length);
    const rightTitleLine = box.h.repeat(rightPadding) + rightTitle + box.h.repeat(rightRightPadding);

    const topBorder = box.tl + leftTitleLine + box.t + rightTitleLine + box.tr;
    lines.push(colorize(topBorder, theme.border || "white"));

    // Content rows
    const contentHeight = height - 2;
    for (let i = 0; i < contentHeight; i++) {
      const leftLine = this.padContent(leftLines[i] ?? "", leftContentWidth);
      const rightLine = this.padContent(rightLines[i] ?? "", rightContentWidth);
      
      // Check if line is a separator (all horizontal lines)
      const leftIsSeparator = this.isSeparatorLine(leftLines[i] ?? "", leftContentWidth);
      const rightIsSeparator = this.isSeparatorLine(rightLines[i] ?? "", rightContentWidth);
      
      // Use appropriate border characters for connections
      const leftBorder = leftIsSeparator 
        ? colorize("├", theme.border || "white")
        : colorize(box.v, theme.border || "white");
      // Middle border: ┤ when left has separator, ├ when right has separator, ┼ when both, │ otherwise
      const middleBorder = leftIsSeparator && rightIsSeparator
        ? colorize("┼", theme.border || "white")
        : leftIsSeparator
          ? colorize("┤", theme.border || "white")
          : rightIsSeparator
            ? colorize("├", theme.border || "white")
            : colorize(box.v, theme.border || "white");
      const rightBorder = rightIsSeparator
        ? colorize("┤", theme.border || "white")
        : colorize(box.v, theme.border || "white");
      
      lines.push(`${leftBorder}${leftLine}${middleBorder}${rightLine}${rightBorder}`);
    }

    // Bottom border
    const bottomBorder =
      box.bl +
      box.h.repeat(leftContentWidth) +
      box.b +
      box.h.repeat(rightContentWidth) +
      box.br;
    lines.push(colorize(bottomBorder, theme.border || "white"));

    return lines;
  }

  private padContent(text: string, width: number): string {
    // Strip ANSI codes for length calculation
    const stripped = text.replace(/\x1b\[[0-9;]*m/g, "");
    const padding = Math.max(0, width - stripped.length);
    return text + " ".repeat(padding);
  }

  /**
   * Check if a line is a separator line (all horizontal dashes)
   */
  private isSeparatorLine(text: string, expectedWidth: number): boolean {
    // Strip ANSI codes
    const stripped = text.replace(/\x1b\[[0-9;]*m/g, "");
    // Check if it's all horizontal line characters
    return stripped === "─".repeat(expectedWidth);
  }
}
