import { keypress } from "@cliffy/keypress";
import type { ITuiRenderer } from "../tui/interfaces.ts";

export interface KeypressActions {
  onQuit: () => Promise<void>;
}

export class KeypressHandler {
  private active = false;

  constructor(
    private renderer: ITuiRenderer,
    private actions: KeypressActions,
  ) {}

  async start(): Promise<void> {
    if (this.active || !Deno.stdin.isTerminal()) return;
    this.active = true;

    for await (const key of keypress()) {
      if (!this.active) break;

      if (key.key === "q") {
        await this.actions.onQuit();
        break;
      } else if (key.key === "c") {
        this.renderer.clearLogs();
        this.renderer.requestRender();
      } else if (key.key === "e") {
        this.renderer.cycleExpand();
        this.renderer.requestRender();
      } else if (key.key === "l") {
        this.renderer.cycleFilter();
        this.renderer.requestRender();
      } else if (key.key === "?") {
        this.renderer.cycleHelp();
        this.renderer.requestRender();
      }
    }
  }

  stop(): void {
    this.active = false;
  }
}
