import type { LogTransport } from "./transport.ts";
import type { LogEntry } from "../tui/interfaces.ts";

export class ConsoleTransport implements LogTransport {
  readonly name = "console";

  constructor(private enabled: boolean = true) {}

  log(entry: LogEntry): void {
    if (!this.enabled) return;
    switch (entry.level) {
      case "error":
        console.error(entry.message);
        break;
      case "warn":
        console.warn(entry.message);
        break;
      default:
        console.log(entry.message);
    }
  }
}
