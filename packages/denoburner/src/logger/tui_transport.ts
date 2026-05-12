import type { LogTransport } from "./transport.ts";
import type { LogEntry } from "../tui/interfaces.ts";

export class TuiTransport implements LogTransport {
  readonly name = "tui";

  constructor(
    private appendLog: (entry: LogEntry) => void,
  ) {}

  log(entry: LogEntry): void {
    this.appendLog(entry);
  }
}
