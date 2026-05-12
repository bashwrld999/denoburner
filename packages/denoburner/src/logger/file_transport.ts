import type { LogTransport } from "./transport.ts";
import type { LogEntry } from "../tui/interfaces.ts";

export class FileTransport implements LogTransport {
  readonly name = "file";

  constructor(
    private filePath: string,
    private maxSizeMB: number = 10,
  ) {}

  log(entry: LogEntry): void {
    try {
      this.checkRotate();
      const ts = this.formatTimestamp(entry.timestamp);
      const cat = entry.category ? `[${entry.category}]` : "";
      const line = `${ts} [${entry.level.toUpperCase()}]${cat} ${entry.message}\n`;
      Deno.writeTextFileSync(this.filePath, line, { append: true });
    } catch {
      // file write error, silently drop
    }
  }

  private checkRotate(): void {
    try {
      const stat = Deno.statSync(this.filePath);
      if (stat.size && stat.size > this.maxSizeMB * 1024 * 1024) {
        Deno.renameSync(this.filePath, this.filePath + ".old");
      }
    } catch {
      // file doesn't exist yet
    }
  }

  private formatTimestamp(d: Date): string {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
}
