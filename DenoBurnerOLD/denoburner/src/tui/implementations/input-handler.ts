/**
 * Input Handler Implementation
 * 
 * Command pattern for keyboard input handling.
 */

import type { InputHandler, KeyBinding, Command } from "../interfaces/index.ts";

/**
 * Input Handler
 * 
 * Manages keyboard input and command execution.
 */
export class TuiInputHandler implements InputHandler {
  private bindings: Map<string, KeyBinding> = new Map();
  private running = false;
  private abortController: AbortController | null = null;

  bind(binding: KeyBinding): void {
    const normalizedKey = this.normalizeKey(binding.key);
    this.bindings.set(normalizedKey, binding);
  }

  unbind(key: string): void {
    const normalizedKey = this.normalizeKey(key);
    this.bindings.delete(normalizedKey);
  }

  getBindings(): KeyBinding[] {
    return Array.from(this.bindings.values());
  }

  handleKey(key: string, code?: number): boolean {
    const normalizedKey = this.normalizeKey(key);
    const binding = this.bindings.get(normalizedKey);

    if (binding) {
      const command = binding.command;
      if (!command.canExecute || command.canExecute()) {
        command.execute();
        return true;
      }
    }

    return false;
  }

  start(): void {
    if (this.running) return;

    this.running = true;
    this.abortController = new AbortController();

    // Enable raw mode
    Deno.stdin.setRaw(true);

    // Start listening for input
    this.listen();
  }

  stop(): void {
    this.running = false;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Disable raw mode
    Deno.stdin.setRaw(false);
  }

  private async listen(): Promise<void> {
    const buffer = new Uint8Array(1024);

    while (this.running) {
      try {
        const n = await Deno.stdin.read(buffer);
        if (n === null) break;

        const byte = buffer[0];

        // Handle special keys
        if (byte === 3) {
          // Ctrl+C
          this.handleKey("ctrl+c", byte);
        } else if (byte === 27) {
          // Escape sequence
          if (n > 1) {
            // Could be arrow keys, etc.
            this.handleKey("escape", byte);
          } else {
            this.handleKey("escape", byte);
          }
        } else if (byte === 13) {
          // Enter
          this.handleKey("enter", byte);
        } else if (byte === 127 || byte === 8) {
          // Backspace
          this.handleKey("backspace", byte);
        } else if (byte >= 32 && byte <= 126) {
          // Printable ASCII
          const key = String.fromCharCode(byte);
          this.handleKey(key.toLowerCase(), byte);
        }
      } catch (error) {
        if (this.running) {
          console.error("Input handler error:", error);
        }
        break;
      }
    }
  }

  private normalizeKey(key: string): string {
    return key.toLowerCase().trim();
  }
}

/**
 * Create an input handler
 */
export function createInputHandler(): InputHandler {
  return new TuiInputHandler();
}

/**
 * Quit Command
 * 
 * Command to quit the application.
 */
export class QuitCommand implements Command {
  readonly id = "quit";
  readonly description = "Exit the application";

  constructor(private onQuit: () => void) {}

  execute(): void {
    this.onQuit();
  }

  canExecute(): boolean {
    return true;
  }
}

/**
 * Clear Console Command
 */
export class ClearConsoleCommand implements Command {
  readonly id = "clearConsole";
  readonly description = "Clear the console panel";

  constructor(private onClear: () => void) {}

  execute(): void {
    this.onClear();
  }
}

/**
 * Toggle Server Command
 * 
 * Command to toggle server expansion in the file list.
 */
export class ToggleServerCommand implements Command {
  readonly id = "toggleServer";
  readonly description = "Toggle server expansion";

  constructor(private onToggle: () => void) {}

  execute(): void {
    this.onToggle();
  }

  canExecute(): boolean {
    return true;
  }
}
