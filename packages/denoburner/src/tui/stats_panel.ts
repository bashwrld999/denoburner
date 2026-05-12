import type { ITuiComponent, RenderContext, ServerFile } from "./interfaces.ts";
import { fg, bg, reset, bold, dim, visiblePadEnd, visibleLen } from "./colors.ts";

const SEP = "\u2500";

export class StatsPanel implements ITuiComponent {
  render(ctx: RenderContext): string[] {
    const { width, stats } = ctx;
    const lines: string[] = [];

    // Row 1: header
    const connBg = stats.status === "connected" ? bg.green : bg.red;
    const title = ` ${connBg}${fg.white}${bold} DenoBurner ${reset} `;
    const hostPort = ` ${fg.cyan}${stats.host}:${stats.port}${reset} `;
    const pad = Math.max(0, width - visibleLen(title) - visibleLen(hostPort) - 2);
    lines.push(` ${title}${" ".repeat(pad)}${hostPort} `);

    // Row 2: separator
    lines.push(SEP.repeat(width));

    // Row 3: connection state / uptime
    if (stats.status === "connected") {
      const up = formatUptime(stats.uptimeSeconds);
      lines.push(visiblePadEnd(`  ${fg.green}\u25cf${reset} Connected ${fg.cyan}${up}${reset}`, width));
    } else if (stats.status === "disconnected") {
      lines.push(visiblePadEnd(`  ${fg.red}\u25cf${reset} Disconnected${reset}`, width));
    } else {
      const dots = ".".repeat((Math.floor(Date.now() / 800) % 3) + 1);
      lines.push(visiblePadEnd(`  ${fg.gray}Waiting${dots}${reset}`, width));
    }

    // Row 4: queue (only when non-zero)
    if (stats.queuePending > 0 || stats.queueFailed > 0) {
      const qParts: string[] = [];
      if (stats.queuePending > 0) qParts.push(`${fg.yellow}${stats.queuePending} pending${reset}`);
      if (stats.queueFailed > 0) qParts.push(`${fg.red}${stats.queueFailed} failed${reset}`);
      lines.push(visiblePadEnd(`  Queue ${qParts.join("  ")}`, width));
    }

    // Row 5: upload counts
    const ok = `${fg.green}${stats.filesUploaded}${reset} ${fg.green}\u2713${reset}`;
    const err = stats.errors > 0
      ? `${fg.red}${stats.errors}${reset} ${fg.red}\u2717${reset}`
      : `${dim}${stats.errors}${reset} ${dim}\u2717${reset}`;
    const skip = stats.skipCount > 0
      ? `${fg.yellow}${stats.skipCount}${reset} ${fg.yellow}\u2298${reset}`
      : `${dim}${stats.skipCount}${reset} ${dim}\u2298${reset}`;
    lines.push(visiblePadEnd(`  Uploads ${ok}  ${err}  ${skip}`, width));

    // Row 5b: last upload time
    if (stats.lastUploadTime > 0) {
      const ago = formatAgo(stats.lastUploadTime);
      lines.push(visiblePadEnd(`  Last upload: ${fg.gray}${ago}${reset}`, width));
    }

    // Row 6: error summary
    if (stats.errors > 0) {
      lines.push(visiblePadEnd(`  ${fg.red}${stats.errors} error(s)${reset}`, width));
    }

    // Row 7: separator
    lines.push(SEP.repeat(width));

    // Row 8: Servers header
    lines.push(visiblePadEnd(`  ${fg.brightMagenta}${bold}Servers${reset}`, width));

    // Server entries (2-column layout)
    const entries = [...stats.servers.entries()];
    const colW = Math.max(10, Math.floor((width - 4) / 2));
    const expanded = stats.expandedServers;

    entries.sort(([a], [b]) => {
      if (a === "home") return -1;
      if (b === "home") return 1;
      return a.localeCompare(b);
    });

    const gridLines: string[][] = [[], []];
    let moreIndicators: [number, number] = [0, 0];

    for (let i = 0; i < entries.length; i++) {
      const [name, files] = entries[i];
      const col = i % 2;
      const isExpanded = expanded.has(name);
      const icon = isExpanded ? "\u25bc" : "\u25b6";
      const totalRam = files.reduce((s: number, f: ServerFile) => s + f.ram, 0);
      const serverLine = ` ${icon} ${name} ${dim}${files.length} files${reset} ${dim}${totalRam.toFixed(2)} GB${reset}`;
      gridLines[col].push(visiblePadEnd(serverLine, colW));

      if (isExpanded && files.length > 0) {
        const visible = files.slice(-5);
        for (const f of visible) {
          gridLines[col].push(visiblePadEnd(
            `    ${fg.cyan}${f.name}${reset}  ${dim}${f.ram.toFixed(2)} GB${reset}`,
            colW,
          ));
        }
        if (files.length > 5) {
          if (col === 0) moreIndicators[0] = files.length - 5;
          else moreIndicators[1] = files.length - 5;
        }
      }
    }

    const maxRows = Math.max(gridLines[0].length, gridLines[1].length);
    for (let r = 0; r < maxRows; r++) {
      const left = r < gridLines[0].length ? gridLines[0][r] : " ".repeat(colW);
      const right = r < gridLines[1].length ? gridLines[1][r] : " ".repeat(colW);
      lines.push(` ${visiblePadEnd(left, colW)} ${visiblePadEnd(right, colW)}`);
    }

    for (let c = 0; c < 2; c++) {
      if (moreIndicators[c] >= 5) {
        lines.push(visiblePadEnd(`    ${dim}... and ${moreIndicators[c]} more${reset}`, width));
      }
    }

    // Fill remaining space
    while (lines.length < ctx.height - 5) {
      lines.push(visiblePadEnd("", width));
    }

    // Bottom separator
    lines.push(SEP.repeat(width));

    // Dep graph stats
    const depStr =
      `  Graph ${dim}${stats.depGraphSize}${reset} files ${dim}\u2022${reset} ` +
      `Max cascade depth ${dim}${stats.cascadeDepth}${reset}`;
    lines.push(visiblePadEnd(depStr, width));

    // Total stats
    const totalStr =
      `  Total ${dim}${stats.watchedCount}${reset} watched ${dim}\u2022${reset} ` +
      `${dim}${stats.filesUploaded}${reset} uploaded ${dim}\u2022${reset} ` +
      `${dim}${stats.totalRam.toFixed(2)} GB${reset} RAM`;
    lines.push(visiblePadEnd(totalStr, width));

    // Bottom separator
    lines.push(SEP.repeat(width));

    // Status bar
    const filterLabel = stats.logLevelFilter === "all" ? dim : fg.cyan;
    const statusLine =
      `  ${fg.gray}[Q]${reset}uit ${fg.gray}[C]${reset}lear ` +
      `${fg.gray}[E]${reset}xpand ${fg.gray}[L]${reset} ${filterLabel}${stats.logLevelFilter.toUpperCase()}${reset} ` +
      `${fg.gray}[?]${reset} Help`;
    lines.push(visiblePadEnd(statusLine, width));

    return lines.slice(-ctx.height);
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
