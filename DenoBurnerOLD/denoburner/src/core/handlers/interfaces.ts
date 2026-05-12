/**
 * Event Handler Interfaces
 * 
 * Command Pattern implementation for handling events.
 * Each handler is responsible for a single event type.
 */

import type { DenoburnerEventMap, ConnectionState } from "../events.ts";
import type { HmrData, UploadResult } from "../../types.ts";
import type { Logger, CategoryLogger } from "../../logger/interfaces/index.ts";

/**
 * Base event handler interface
 * 
 * All handlers must implement this interface.
 * Uses the Command Pattern for encapsulation.
 */
export interface IEventHandler<TPayload> {
  /**
   * Unique handler name for identification
   */
  readonly name: string;

  /**
   * Handle the event
   * @param payload - Event payload
   */
  handle(payload: TPayload): Promise<void> | void;
}

/**
 * Connection event payloads
 */
export type ConnectionStateChangedPayload = DenoburnerEventMap["connection:stateChanged"];
export type ConnectionConnectedPayload = DenoburnerEventMap["connection:connected"];
export type ConnectionDisconnectedPayload = DenoburnerEventMap["connection:disconnected"];

/**
 * File event payloads
 */
export type FileCreatedPayload = HmrData;
export type FileModifiedPayload = HmrData;
export type FileDeletedPayload = DenoburnerEventMap["file:deleted"];

/**
 * Upload event payloads
 */
export type UploadStartPayload = DenoburnerEventMap["upload:start"];
export type UploadSuccessPayload = { result: UploadResult };
export type UploadErrorPayload = DenoburnerEventMap["upload:error"];

/**
 * Handler context - shared dependencies
 */
export interface HandlerContext {
  /** Logger instance */
  log: Logger;
  /** Category-specific logger */
  categoryLog: CategoryLogger;
}

/**
 * Connection handler context
 */
export interface ConnectionHandlerContext extends HandlerContext {
  /** Server port */
  port: number;
}

/**
 * File handler context
 */
export interface FileHandlerContext extends HandlerContext {
  /** Whether connected to Bitburner */
  isConnected: () => boolean;
}

/**
 * Upload handler context
 */
export interface UploadHandlerContext extends HandlerContext {
  /** Update TUI stats */
  updateTuiStats: () => void;
}
