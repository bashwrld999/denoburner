/**
 * Event Handlers
 * 
 * Command Pattern implementation for event handling.
 * Each handler is responsible for a single event type.
 */

// Interfaces
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
  HandlerContext,
  ConnectionHandlerContext,
  FileHandlerContext,
  UploadHandlerContext,
} from "./interfaces.ts";

// Connection handlers
export {
  ConnectionStateChangedHandler,
  ConnectionConnectedHandler,
  ConnectionDisconnectedHandler,
  createConnectionHandlers,
  type ConnectionHandlerDeps,
} from "./connection-handlers.ts";

// File handlers
export {
  FileCreatedHandler,
  FileModifiedHandler,
  FileDeletedHandler,
  createFileHandlers,
  type FileHandlerDeps,
} from "./file-handlers.ts";

// Upload handlers
export {
  UploadStartHandler,
  UploadSuccessHandler,
  UploadErrorHandler,
  createUploadHandlers,
  type UploadHandlerDeps,
} from "./upload-handlers.ts";
