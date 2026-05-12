/**
 * Event Flow Plugin Interfaces
 * 
 * Plugin architecture for event flows.
 * Allows extending the event mediator with custom event handling logic.
 */

import type { IEventBus } from "../event-bus.ts";
import type { DenoburnerEventMap } from "../events.ts";
import type { IEventHandler } from "../handlers/interfaces.ts";
import type { Logger } from "../../logger/interfaces/index.ts";

/**
 * Plugin context - provides access to mediator internals
 */
export interface PluginContext {
  /** Event bus for subscribing/publishing events */
  eventBus: IEventBus<DenoburnerEventMap>;
  /** Logger instance */
  log: Logger;
  /** Register an event handler */
  registerHandler: (handler: IEventHandler<unknown>) => void;
  /** Subscribe to an event with automatic cleanup tracking */
  subscribe: <K extends keyof DenoburnerEventMap>(
    event: K,
    handler: (payload: DenoburnerEventMap[K]) => void | Promise<void>,
  ) => () => void;
}

/**
 * Event Flow Plugin
 * 
 * A plugin that can register event handlers and wire up event flows.
 * Plugins are initialized in order and disposed in reverse order.
 */
export interface IEventFlowPlugin {
  /**
   * Plugin name for identification
   */
  readonly name: string;

  /**
   * Plugin version
   */
  readonly version?: string;

  /**
   * Plugin priority (lower = earlier initialization)
   * Default: 100
   */
  readonly priority?: number;

  /**
   * Initialize the plugin
   * Called when the mediator is constructed.
   * 
   * @param context - Plugin context with access to mediator internals
   */
  initialize(context: PluginContext): void | Promise<void>;

  /**
   * Dispose the plugin
   * Called when the mediator is disposed.
   * Should clean up any subscriptions or resources.
   */
  dispose?(): void | Promise<void>;
}

/**
 * Plugin registration options
 */
export interface PluginRegistrationOptions {
  /** Whether to initialize the plugin immediately */
  initialize?: boolean;
  /** Override plugin priority */
  priority?: number;
}

/**
 * Plugin manager for managing event flow plugins
 */
export interface IPluginManager {
  /**
   * Register a plugin
   * @param plugin - Plugin to register
   * @param options - Registration options
   */
  register(plugin: IEventFlowPlugin, options?: PluginRegistrationOptions): void;

  /**
   * Unregister a plugin by name
   * @param name - Plugin name
   */
  unregister(name: string): void;

  /**
   * Get a plugin by name
   * @param name - Plugin name
   */
  get(name: string): IEventFlowPlugin | undefined;

  /**
   * Get all registered plugins
   */
  getAll(): IEventFlowPlugin[];

  /**
   * Initialize all plugins
   * @param context - Plugin context
   */
  initializeAll(context: PluginContext): Promise<void>;

  /**
   * Dispose all plugins in reverse order
   */
  disposeAll(): Promise<void>;
}
