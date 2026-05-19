import type { ITuiComponent, RenderContext, ServerFile } from "./interfaces.ts";
import { fg, bg, reset, bold, dim, visiblePadEnd, visibleLen } from "./colors.ts";

const SEP = "\u2500";

export class StatsPanel implements ITuiComponent {
  render(ctx: RenderContext): string[] {
    const { width, stats } = ctx;
    const lines: string[] = [];

    // Header
    const connBg = stats.status === "connected" ? bg.green : bg.red;
    const title = ` ${connBg}${fg.white}${bold} DenoBurner ${reset} `;
    const hostPort = ` ${fg.cyan}${stats.host}:${stats.port}${reset} `;
    const pad = Math.max(0, width - visibleLen(title) - visibleLen(hostPort) - 2);
    lines.push(` ${title}${" ".repeat(pad)}${hostPort} `);

    // Separator
    lines.push(SEP.repeat(width));

    // Connection state / uptime
    if (stats.status === "connected") {
      const up = formatUptime(stats.uptimeSeconds);
      lines.push(visiblePadEnd(`  ${fg.green}\u25cf${reset} Connected ${fg.cyan}${up}${reset}`, width));
    } else if (stats.status === "disconnected") {
      lines.push(visiblePadEnd(`  ${fg.red}\u25cf${reset} Disconnected${reset}`, width));
    } else {
      const dots = ".".repeat((Math.floor(Date.now() / 800) % 3) + 1);
      lines.push(visiblePadEnd(`  ${fg.gray}Waiting${dots}${reset}`, width));
    }

    // Upload / error / skip counts + last upload time
    const ok = `${fg.green}${stats.filesUploaded} \u2713${reset}`;
    const err = stats.errors > 0
      ? `${fg.red}${stats.errors} \u2717${reset}`
      : `${dim}0 \u2717${reset}`;
    const skip = stats.skipCount > 0
      ? `${fg.yellow}${stats.skipCount} \u2298${reset}`
      : `${dim}0 \u2298${reset}`;
    let uploadLine = `  ${ok}  ${err}  ${skip}`;
    if (stats.lastUploadTime > 0) {
      const ago = formatAgo(stats.lastUploadTime);
      uploadLine += `  ${fg.gray}Last: ${ago}${reset}`;
    }
    lines.push(visiblePadEnd(uploadLine, width));

    // Queue (only when non-zero)
    if (stats.queuePending > 0 || stats.queueFailed > 0) {
      const qParts: string[] = [];
      if (stats.queuePending > 0) qParts.push(`${fg.yellow}${stats.queuePending} pending${reset}`);
      if (stats.queueFailed > 0) qParts.push(`${fg.red}${stats.queueFailed} failed${reset}`);
      lines.push(visiblePadEnd(`  Queue ${qParts.join("  ")}`, width));
    }

    // Separator
    lines.push(SEP.repeat(width));

    // Servers header
    lines.push(visiblePadEnd(`  ${fg.brightMagenta}${bold}Servers${reset}`, width));

    // Server entries (1-column)
    const entries = [...stats.servers.entries()];
    const expanded = stats.expandedServers;
    const nameCol = 12;

    entries.sort(([a], [b]) => {
      if (a === "home") return -1;
      if (b === "home") return 1;
      return a.localeCompare(b);
    });

    for (const [name, files] of entries) {
      const isExpanded = expanded.has(name);
      const icon = isExpanded ? "\u25bc" : "\u25b6";
      const totalRam = files.reduce((s: number, f: ServerFile) => s + f.ram, 0);
      const namePart = visiblePadEnd(` ${icon} ${name}`, nameCol);
      const filesPart = `${dim}${files.length} files${reset}`;
      const ramPart = `${dim}${totalRam.toFixed(2)} GB${reset}`;
      lines.push(visiblePadEnd(` ${namePart} ${filesPart}  ${ramPart}`, width));

      if (isExpanded && files.length > 0) {
        const visible = files.slice(-5);
        for (const f of visible) {
          lines.push(visiblePadEnd(
            `  ${fg.cyan}${visiblePadEnd(f.name, nameCol)}${reset}  ${dim}${f.ram.toFixed(2)} GB${reset}`,
            width,
          ));
        }
        if (files.length > 5) {
          lines.push(visiblePadEnd(`  ${dim}... and ${files.length - 5} more${reset}`, width));
        }
      }
    }

    // Fill remaining space
    while (lines.length < ctx.height - 4) {
      lines.push(visiblePadEnd("", width));
    }

    // Separator
    lines.push(SEP.repeat(width));

    // Total stats (RAM + server count)
    const totalStr =
      `  Total: ${dim}${stats.totalRam.toFixed(2)} GB${reset}  ${dim}${entries.length}${reset} servers`;
    lines.push(visiblePadEnd(totalStr, width));

    // Separator
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
