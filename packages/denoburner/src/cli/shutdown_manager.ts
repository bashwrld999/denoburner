import type { ILogger } from "../logger/interfaces.ts";
import { toDenoburnerError } from "../core/errors.ts";

export interface Shutdownable {
  name: string;
  stop(): Promise<unknown> | void;
}

export class ShutdownManager {
  private components: Shutdownable[] = [];
  private shuttingDown = false;

  constructor(
    private logger: ILogger,
    private exitOnComplete: boolean = true,
  ) {}

  add(component: Shutdownable): void {
    this.components.push(component);
  }

  async shutdown(): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    for (const component of this.components) {
      try {
        this.logger.info(`Shutting down: ${component.name}`);
        await component.stop();
      } catch (err) {
        this.logger.warn(`Error shutting down ${component.name}: ${toDenoburnerError(err).message}`);
      }
    }

    if (this.exitOnComplete) {
      Deno.exit(0);
    }
  }

  setupSignalHandlers(): void {
    let forceExit = false;
    try {
      Deno.addSignalListener("SIGINT", async () => {
        if (forceExit) Deno.exit(1);
        forceExit = true;
        await this.shutdown();
      });
      Deno.addSignalListener("SIGTERM", async () => {
        if (forceExit) Deno.exit(1);
        forceExit = true;
        await this.shutdown();
      });
    } catch {
      // signals not available
    }
  }
}
