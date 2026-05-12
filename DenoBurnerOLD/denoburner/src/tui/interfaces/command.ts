/**
 * Command Interface
 * 
 * Command pattern for input handling.
 */

/**
 * Command Interface
 * 
 * Encapsulates an action that can be executed.
 */
export interface Command {
  /** Unique command identifier */
  readonly id: string;

  /** Human-readable description */
  readonly description: string;

  /**
   * Execute the command
   */
  execute(): void | Promise<void>;

  /**
   * Check if the command can be executed
   */
  canExecute?(): boolean;
}

/**
 * Key Binding
 */
export interface KeyBinding {
  /** Key to bind (e.g., 'q', 'ctrl+c', 'escape') */
  key: string;

  /** Command to execute */
  command: Command;

  /** Optional description for help text */
  description?: string;
}

/**
 * Input Handler Interface
 * 
 * Manages keyboard input and command execution.
 */
export interface InputHandler {
  /**
   * Register a key binding
   */
  bind(binding: KeyBinding): void;

  /**
   * Unregister a key binding
   */
  unbind(key: string): void;

  /**
   * Get all key bindings
   */
  getBindings(): KeyBinding[];

  /**
   * Handle a key press
   */
  handleKey(key: string, code?: number): boolean;

  /**
   * Start listening for input
   */
  start(): void;

  /**
   * Stop listening for input
   */
  stop(): void;
}
