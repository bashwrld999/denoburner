import type { ILogger } from "./interfaces.ts";
import type { LogEntry } from "../tui/interfaces.ts";
import type { LogTransport } from "./transport.ts";

export interface LoggerOptions {
  defaultCategory?: string;
}

export class Logger implements ILogger {
  private transports: LogTransport[] = [];
  private defaultCategory: string;

  constructor(options?: LoggerOptions) {
    this.defaultCategory = options?.defaultCategory ?? "App";
  }

  info(message: string): void {
    this.write("info", message, this.defaultCategory);
  }

  success(message: string): void {
    this.write("success", message, this.defaultCategory);
  }

  warn(message: string): void {
    this.write("warn", message, this.defaultCategory);
  }

  error(message: string): void {
    this.write("error", message, this.defaultCategory);
  }

  child(context: Record<string, unknown>): ILogger {
    const cat = typeof context.category === "string" ? context.category : this.defaultCategory;
    return new ChildLogger(this, cat);
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  removeTransport(name: string): void {
    const idx = this.transports.findIndex((t) => t.name === name);
    if (idx !== -1) this.transports.splice(idx, 1);
  }

  write(level: string, message: string, category: string): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: level as LogEntry["level"],
      category,
      message,
    };
    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch {
        // transport error
      }
    }
  }
}

export class ChildLogger implements ILogger {
  constructor(
    private parent: Logger,
    private category: string,
  ) {}

  info(message: string): void {
    this.parent.write("info", message, this.category);
  }

  success(message: string): void {
    this.parent.write("success", message, this.category);
  }

  warn(message: string): void {
    this.parent.write("warn", message, this.category);
  }

  error(message: string): void {
    this.parent.write("error", message, this.category);
  }

  child(context: Record<string, unknown>): ILogger {
    const cat = typeof context.category === "string" ? context.category : this.category;
    return new ChildLogger(this.parent, cat);
  }
}
