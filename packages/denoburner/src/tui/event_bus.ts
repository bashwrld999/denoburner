import type { ITuiEventBus, TuiEvent } from "./interfaces.ts";
import type { ILogger } from "../logger/interfaces.ts";

export class TuiEventBus implements ITuiEventBus {
  private handlers: Set<(event: TuiEvent) => void> = new Set();

  constructor(private logger?: ILogger) {}

  emit(event: TuiEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger?.error(`TuiEventBus handler error: ${msg}`);
      }
    }
  }

  on(handler: (event: TuiEvent) => void): void {
    this.handlers.add(handler);
  }

  off(handler: (event: TuiEvent) => void): void {
    this.handlers.delete(handler);
  }
}
