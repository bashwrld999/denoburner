/**
 * Event Flow Plugins
 * 
 * Plugin architecture for extending event handling.
 */

// Interfaces
export type {
  IEventFlowPlugin,
  IPluginManager,
  PluginContext,
  PluginRegistrationOptions,
} from "./interfaces.ts";

// Plugin manager
export { PluginManager, createPluginManager } from "./plugin-manager.ts";

// Built-in plugins
export {
  ConnectionEventPlugin,
  FileEventPlugin,
  UploadEventPlugin,
  QueueEventPlugin,
  createBuiltinPlugins,
  type BuiltinPluginDeps,
} from "./builtin-plugins.ts";
