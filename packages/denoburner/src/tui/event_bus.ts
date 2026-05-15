import type { ITuiEventBus, TuiEvent } from "./interfaces.ts";
import type { ILogger } from "../logger/interfaces.ts";
import { toDenoburnerError } from "../core/errors.ts";

export class TuiEventBus implements ITuiEventBus {
  private handlers: Set<(event: TuiEvent) => void> = new Set();

  constructor(private logger?: ILogger) {}

  emit(event: TuiEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (err) {
        this.logger?.error(`TuiEventBus handler error: ${toDenoburnerError(err).message}`);
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
