import type { LogEntry } from "../tui/interfaces.ts";

export interface LogTransport {
  readonly name: string;
  log(entry: LogEntry): void;
}
