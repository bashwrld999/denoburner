/**
 * Stats Panel Component
 * 
 * Modern, elegant design with:
 * - Connection status with duration
 * - Upload statistics
 * - Queue status
 * - Files grouped by server
 * - Status bar with keyboard shortcuts
 */

import type { TuiComponent, RenderContext } from "./component.ts";
import type { TuiState } from "../interfaces/state-store.ts";
import { colorize, colors } from "../colors.ts";

/**
 * Stats panel component - displays connection and file statistics
 */
export class StatsPanel implements TuiComponent {
  readonly name = "StatsPanel";

  render(context: RenderContext): string[] {
    const { stats, theme, width, height } = context;
    const lines: string[] = [];
    const indent = "  "; // 2 spaces indent

    // Box drawing characters for separators that connect to borders
    const hLine = "─".repeat(width);

    // Helper to pad line to width
    const padLine = (text: string): string => {
      const stripped = text.replace(/\x1b\[[0-9;]*m/g, "");
      const padding = Math.max(0, width - stripped.length);
      return text + " ".repeat(padding);
    };

    // Get state for additional info
    const state = context.state;
    const connection = state?.connection;
    const queue = state?.queue;
    const files = state?.files;

    // Header: DenoBurner with colored background (green=connected, red=disconnected)
    // Port on the right side with 2 space padding
    const bgColor = stats.connected ? colors.bgGreen : colors.bgRed;
    const titleLeft = `${indent}${bgColor}${colors.white} DenoBurner ${colors.reset}`;
    const titleRight = `Port ${colorize(String(stats.port), "gray")}  `;
    const titlePadding = Math.max(0, width - titleLeft.replace(/\x1b\[[0-9;]*m/g, "").length - titleRight.replace(/\x1b\[[0-9;]*m/g, "").length);
    lines.push(padLine(`${titleLeft}${" ".repeat(titlePadding)}${titleRight}`));

    // Separator line
    lines.push(colorize(hLine, theme.border || "white"));

    // Uptime (only when connected)
    if (stats.connected && connection?.connectedAt) {
      const duration = this.formatDuration(connection.connectedAt);
      lines.push(padLine(`${indent}Uptime ${colorize(duration, theme.header || "cyan")}`));
    }

    // Queue status (only when pending)
    if (queue && queue.pending > 0) {
      const queueStr = colorize(`${queue.pending} pending`, "yellow");
      lines.push(padLine(`${indent}Queue ${queueStr}`));
    }

    // Upload statistics
    if (files) {
      const successStr = files.successCount > 0 
        ? `${colorize(String(files.successCount), "green")} ✓` 
        : "0 ✓";
      const errorStr = files.errorCount > 0 
        ? `${colorize(String(files.errorCount), "red")} ✗` 
        : "0 ✗";
      const skippedStr = files.skippedCount > 0 
        ? `${colorize(String(files.skippedCount), "gray")} ⊘` 
        : "0 ⊘";
      
      lines.push(padLine(`${indent}Uploads ${successStr}  ${errorStr}  ${skippedStr}`));
    }

    // Separator line
    lines.push(colorize(hLine, theme.border || "white"));

    // Servers section - per-server breakdown in 2 columns
    lines.push(padLine(indent + colorize("Servers", theme.header || "cyan")));

    // Group files by server and calculate per-server stats
    const groupedFiles = this.groupByServer(stats.files);
    const expandedServers = state?.ui?.expandedServers ?? ["home"];
    const serverEntries = [...groupedFiles.entries()];
    
    // Calculate column width (half of available width, minus indent)
    const colWidth = Math.floor((width - 4) / 2); // 4 for indent and spacing
    
    // Render servers in 2 columns
    for (let i = 0; i < serverEntries.length; i += 2) {
      const left = serverEntries[i];
      const right = serverEntries[i + 1];
      
      // Build left column
      const leftServer = left[0];
      const leftFiles = left[1];
      const leftRam = leftFiles.reduce((sum, f) => sum + f.ram, 0);
      const leftExpanded = expandedServers.includes(leftServer);
      const leftIcon = leftExpanded ? "▼" : "▶";
      const leftLine = `${leftIcon} ${leftServer} ${colorize(String(leftFiles.length), "gray")} files ${colorize(this.formatRam(leftRam), "gray")}`;
      
      // Build right column (if exists)
      let line = indent + leftLine;
      if (right) {
        const rightServer = right[0];
        const rightFiles = right[1];
        const rightRam = rightFiles.reduce((sum, f) => sum + f.ram, 0);
        const rightExpanded = expandedServers.includes(rightServer);
        const rightIcon = rightExpanded ? "▼" : "▶";
        const rightLine = `${rightIcon} ${rightServer} ${colorize(String(rightFiles.length), "gray")} files ${colorize(this.formatRam(rightRam), "gray")}`;
        
        // Pad left column and add right
        const leftStripped = leftLine.replace(/\x1b\[[0-9;]*m/g, "");
        const padding = Math.max(2, colWidth - leftStripped.length);
        line = indent + leftLine + " ".repeat(padding) + rightLine;
      }
      
      lines.push(padLine(line));
      
      // Show expanded files in 2 columns below the server row
      if (leftExpanded || (right && expandedServers.includes(right[0]))) {
        const MAX_VISIBLE_FILES = 5;
        // Files are already sorted newest first, so take the first 5
        const leftExpandedFiles = leftExpanded ? leftFiles.slice(0, MAX_VISIBLE_FILES) : [];
        const rightExpandedFiles = right && expandedServers.includes(right[0]) ? right[1].slice(0, MAX_VISIBLE_FILES) : [];
        
        const maxFiles = Math.max(leftExpandedFiles.length, rightExpandedFiles.length);
        
        for (let f = 0; f < maxFiles; f++) {
          const leftFile = leftExpandedFiles[f];
          const rightFile = rightExpandedFiles[f];
          
          // Build left file line
          let leftFileLine = "";
          if (leftFile) {
            const fileRamDisplay = colorize(this.formatRam(leftFile.ram), "gray");
            const bundledStr = leftFile.bundled && leftFile.bundledDeps 
              ? colorize(` (${leftFile.bundledDeps} deps)`, "gray") 
              : "";
            leftFileLine = `    ${leftFile.filename}  ${fileRamDisplay}${bundledStr}`;
          }
          
          // Build right file line
          let rightFileLine = "";
          if (rightFile) {
            const fileRamDisplay = colorize(this.formatRam(rightFile.ram), "gray");
            const bundledStr = rightFile.bundled && rightFile.bundledDeps 
              ? colorize(` (${rightFile.bundledDeps} deps)`, "gray") 
              : "";
            rightFileLine = `    ${rightFile.filename}  ${fileRamDisplay}${bundledStr}`;
          }
          
          // Combine into 2 columns
          let fileLine = indent + leftFileLine;
          if (rightFileLine) {
            const leftStripped = leftFileLine.replace(/\x1b\[[0-9;]*m/g, "");
            const padding = Math.max(2, colWidth - leftStripped.length);
            fileLine = indent + leftFileLine + " ".repeat(padding) + rightFileLine;
          }
          
          lines.push(padLine(fileLine));
        }
        
        // Show indicator at bottom if there are more files
        if (leftExpanded && leftFiles.length > MAX_VISIBLE_FILES) {
          lines.push(padLine(indent + colorize(`    ... and ${leftFiles.length - MAX_VISIBLE_FILES} more`, "gray")));
        }
        
        // Show indicator for right side at bottom if there are more files
        const rightServer = right?.[0];
        if (rightServer && right[1].length > MAX_VISIBLE_FILES) {
          lines.push(padLine(indent + "                                                        " + colorize(`... and ${right[1].length - MAX_VISIBLE_FILES} more`, "gray")));
        }
      }
    }

    // Fill remaining space (leave 4 lines for total stats + status bar)
    while (lines.length < height - 4) {
      lines.push(padLine(""));
    }

    // Separator line before total stats
    lines.push(colorize(hLine, theme.border || "white"));

    // Total stats (fixed position above status bar)
    const watchedStr = colorize(String(stats.filesWatched), "gray");
    const uploadedStr = colorize(String(stats.filesUploaded), "gray");
    const ramStr = colorize(this.formatRam(stats.totalRam), "gray");
    lines.push(padLine(`${indent}Total ${watchedStr} watched  •  ${uploadedStr} uploaded  •  ${ramStr} RAM`));

    // Separator line before status bar
    lines.push(colorize(hLine, theme.border || "white"));

    // Status bar with keyboard shortcuts
    const quitKey = colorize("[Q]", "gray");
    const clearKey = colorize("[C]", "gray");
    const expandKey = colorize("[E]", "gray");
    const logLevelFilter = state?.ui?.logLevelFilter ?? "all";
    const logKey = colorize(`[L] ${logLevelFilter.toUpperCase()}`, logLevelFilter === "all" ? "gray" : "cyan");
    lines.push(padLine(`${indent}${quitKey} Quit  ${clearKey} Clear  ${expandKey} Expand  ${logKey}`));

    return lines;
  }

  private formatDuration(start: Date): string {
    const elapsed = Date.now() - start.getTime();
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  private formatRam(ram: number): string {
    if (ram < 1) {
      return `${(ram * 1000).toFixed(0)} MB`;
    }
    return `${ram.toFixed(2)} GB`;
  }

  private getRamColor(ram: number, theme: Record<string, string>): string {
    if (ram < 2) return theme.ramLow || "green";
    if (ram < 4) return theme.ramMedium || "yellow";
    return theme.ramHigh || "red";
  }

  private groupByServer(files: Array<{ server: string; filename: string; ram: number; bundled?: boolean; bundledDeps?: number }>): Map<string, typeof files> {
    const grouped = new Map<string, typeof files>();
    
    for (const file of files) {
      const serverFiles = grouped.get(file.server) ?? [];
      serverFiles.push(file);
      grouped.set(file.server, serverFiles);
    }

    // Sort: home first, then alphabetically
    const sorted = new Map<string, typeof files>();
    if (grouped.has("home")) {
      sorted.set("home", grouped.get("home")!);
      grouped.delete("home");
    }
    for (const [server, serverFiles] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      sorted.set(server, serverFiles);
    }

    return sorted;
  }
}
