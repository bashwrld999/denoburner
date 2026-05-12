import type { ITuiComponent, RenderContext } from "./interfaces.ts";
import { fg, reset, stripAnsi, visiblePadEnd } from "./colors.ts";

const box = {
  tl: "\u250c",
  tr: "\u2510",
  bl: "\u2514",
  br: "\u2518",
  h: "\u2500",
  v: "\u2502",
  t: "\u252c",
  b: "\u2534",
  l: "\u251c",
  r: "\u2524",
  x: "\u253c",
};

export class SplitLayout implements ITuiComponent {
  private leftRatio: number;

  constructor(
    private left: ITuiComponent,
    private right: ITuiComponent,
    leftRatio = 0.20,
  ) {
    this.leftRatio = leftRatio;
  }

  render(ctx: RenderContext): string[] {
    const totalW = ctx.width;
    const totalH = ctx.height;

    const contentW = totalW - 3;
    const leftW = Math.floor(contentW * this.leftRatio);
    const rightW = contentW - leftW;

    const leftCtx: RenderContext = { ...ctx, width: leftW, height: totalH - 2 };
    const rightCtx: RenderContext = { ...ctx, width: rightW, height: totalH - 2 };

    const leftLines = this.left.render(leftCtx);
    const rightLines = this.right.render(rightCtx);

    const lines: string[] = [];

    // Top border with titles
    const leftTitle = " STATS ";
    const rightTitle = " CONSOLE ";
    const leftDash1 = Math.max(1, Math.floor((leftW - leftTitle.length) / 2));
    const leftDash2 = leftW - leftDash1 - leftTitle.length;
    const rightDash1 = Math.max(1, Math.floor((rightW - rightTitle.length) / 2));
    const rightDash2 = rightW - rightDash1 - rightTitle.length;
    lines.push(
      `${fg.white}${box.tl}${box.h.repeat(leftDash1)}${leftTitle}${box.h.repeat(leftDash2)}${box.t}${
        box.h.repeat(rightDash1)
      }${rightTitle}${box.h.repeat(rightDash2)}${box.tr}${reset}`,
    );

    // Content rows
    const maxH = Math.max(leftLines.length, rightLines.length);
    const separatorLine = box.h.repeat(leftW);
    const rightSeparator = box.h.repeat(rightW);

    for (let y = 0; y < maxH; y++) {
      const lRaw = y < leftLines.length ? leftLines[y] : "";
      const rRaw = y < rightLines.length ? rightLines[y] : "";

      const lStripped = stripAnsi(lRaw);
      const rStripped = stripAnsi(rRaw);
      const lSep = lStripped === separatorLine;
      const rSep = rStripped === rightSeparator;

      // Determine border chars
      let leftB = box.v;
      let midB = box.v;
      let rightB = box.v;

      if (lSep && rSep) {
        leftB = box.l;
        midB = box.x;
        rightB = box.r;
      } else if (lSep) {
        leftB = box.l;
        midB = box.r;
      } else if (rSep) {
        midB = box.l;
        rightB = box.r;
      }

      const lPad = visiblePadEnd(lRaw, leftW);
      const rPad = rRaw ? visiblePadEnd(rRaw, rightW) : " ".repeat(rightW);
      lines.push(
        `${fg.white}${leftB}${reset}${lPad}${fg.white}${midB}${reset}${rPad}${fg.white}${rightB}${reset}`,
      );
    }

    // Bottom border
    lines.push(
      `${fg.white}${box.bl}${box.h.repeat(leftW)}${box.b}${box.h.repeat(rightW)}${box.br}${reset}`,
    );

    return lines;
  }
}
