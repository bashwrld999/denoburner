/**
 * Core Module
 * 
 * Provides foundational utilities for the denoburner application:
 * - EventEmitter: Type-safe event system
 * - TypedEventBus: Central event bus for decoupled communication
 * - EventMediator: Decouples components via event bus
 * - Result: Explicit error handling
 * - StateStore: Centralized state management
 * - ServiceContainer: Dependency injection container
 * - Event Handlers: Command pattern handlers for events
 * - Event Flow Plugins: Plugin architecture for event flows
 */

export { EventEmitter } from "./event-emitter.ts";
export { TypedEventBus, createEventBus, type IEventBus, type EventMap, type EventHandler } from "./event-bus.ts";
export type { DenoburnerEventMap, DenoburnerEventType, EventPayload, ConnectionState } from "./events.ts";
export { EventMediator, createEventMediator, type EventMediatorComponents } from "./event-mediator.ts";
export { Result, type Ok, type Err, type Result as ResultType } from "./result.ts";
export { StateStore } from "./state-store.ts";
export { ServiceContainer, ServiceToken, type IServiceContainer, type ServiceFactory } from "./service-container.ts";

// Event handlers (Command Pattern)
export type {
  IEventHandler,
  ConnectionStateChangedPayload,
  ConnectionConnectedPayload,
  ConnectionDisconnectedPayload,
  FileCreatedPayload,
  FileModifiedPayload,
  FileDeletedPayload,
  UploadStartPayload,
  UploadSuccessPayload,
  UploadErrorPayload,
} from "./handlers/index.ts";
export {
  ConnectionStateChangedHandler,
  ConnectionConnectedHandler,
  ConnectionDisconnectedHandler,
  createConnectionHandlers,
  FileCreatedHandler,
  FileModifiedHandler,
  FileDeletedHandler,
  createFileHandlers,
  UploadStartHandler,
  UploadSuccessHandler,
  UploadErrorHandler,
  createUploadHandlers,
} from "./handlers/index.ts";

// Event flow plugins
export type {
  IEventFlowPlugin,
  IPluginManager,
  PluginContext,
  PluginRegistrationOptions,
} from "./plugins/index.ts";
export {
  PluginManager,
  createPluginManager,
  ConnectionEventPlugin,
  FileEventPlugin,
  UploadEventPlugin,
  QueueEventPlugin,
  createBuiltinPlugins,
} from "./plugins/index.ts";
