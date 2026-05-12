/**
 * Plugin Manager Implementation
 * 
 * Manages event flow plugins with lifecycle support.
 */

import type { IEventFlowPlugin, IPluginManager, PluginContext, PluginRegistrationOptions } from "./interfaces.ts";

/**
 * Internal plugin entry
 */
interface PluginEntry {
  plugin: IEventFlowPlugin;
  initialized: boolean;
  priority: number;
}

/**
 * Plugin Manager
 * 
 * Manages registration, initialization, and disposal of event flow plugins.
 */
export class PluginManager implements IPluginManager {
  private plugins: Map<string, PluginEntry> = new Map();
  private context?: PluginContext;

  /**
   * Register a plugin
   */
  register(plugin: IEventFlowPlugin, options?: PluginRegistrationOptions): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin already registered: ${plugin.name}`);
    }

    const priority = options?.priority ?? plugin.priority ?? 100;
    
    this.plugins.set(plugin.name, {
      plugin,
      initialized: false,
      priority,
    });

    // Initialize immediately if requested and context is available
    if (options?.initialize && this.context) {
      this.initializePlugin(plugin.name);
    }
  }

  /**
   * Unregister a plugin by name
   */
  async unregister(name: string): Promise<void> {
    const entry = this.plugins.get(name);
    if (!entry) return;

    // Dispose if initialized
    if (entry.initialized && entry.plugin.dispose) {
      await entry.plugin.dispose();
    }

    this.plugins.delete(name);
  }

  /**
   * Get a plugin by name
   */
  get(name: string): IEventFlowPlugin | undefined {
    return this.plugins.get(name)?.plugin;
  }

  /**
   * Get all registered plugins
   */
  getAll(): IEventFlowPlugin[] {
    return Array.from(this.plugins.values())
      .sort((a, b) => a.priority - b.priority)
      .map(entry => entry.plugin);
  }

  /**
   * Initialize all plugins
   */
  async initializeAll(context: PluginContext): Promise<void> {
    this.context = context;

    // Sort by priority (lower = earlier)
    const sorted = Array.from(this.plugins.entries())
      .sort((a, b) => a[1].priority - b[1].priority);

    for (const [name] of sorted) {
      await this.initializePlugin(name);
    }
  }

  /**
   * Dispose all plugins in reverse order
   */
  async disposeAll(): Promise<void> {
    // Sort by priority in reverse (higher priority = disposed first)
    const sorted = Array.from(this.plugins.entries())
      .sort((a, b) => b[1].priority - a[1].priority);

    for (const [name, entry] of sorted) {
      if (entry.initialized && entry.plugin.dispose) {
        try {
          await entry.plugin.dispose();
        } catch (error) {
          console.error(`Error disposing plugin ${name}:`, error);
        }
      }
      entry.initialized = false;
    }

    this.context = undefined;
  }

  /**
   * Initialize a single plugin
   */
  private async initializePlugin(name: string): Promise<void> {
    const entry = this.plugins.get(name);
    if (!entry || entry.initialized || !this.context) return;

    try {
      await entry.plugin.initialize(this.context);
      entry.initialized = true;
    } catch (error) {
      console.error(`Error initializing plugin ${name}:`, error);
      throw error;
    }
  }
}

/**
 * Create a plugin manager
 */
export function createPluginManager(): IPluginManager {
  return new PluginManager();
}
