/**
 * Denoburner Event Types
 * 
 * Defines all events in the system with their payload types.
 * This provides type safety for the event bus.
 */

import type { HmrData } from "../types.ts";
import type { UploadResult } from "../types.ts";
import type { TrackedFile } from "../state/types.ts";

/**
 * Connection state
 */
export type ConnectionState = "disconnected" | "listening" | "connected" | "error";

/**
 * Denoburner Event Map
 * 
 * Maps event names to their payload types for type-safe event handling.
 * Includes index signature to satisfy EventMap constraint.
 */
export interface DenoburnerEventMap {
  // Index signature for EventMap compatibility
  [key: string]: unknown;
  
  // Connection events
  "connection:stateChanged": { state: ConnectionState; port: number };
  "connection:connected": { port: number };
  "connection:disconnected": {};

  // File events
  "file:changed": HmrData;
  "file:created": HmrData;
  "file:modified": HmrData;
  "file:deleted": { file: string; server: string };

  // Upload events
  "upload:start": { file: string; server: string };
  "upload:success": { result: UploadResult };
  "upload:error": { file: string; server: string; error: Error };
  "upload:skipped": { file: string; server: string; reason: string };

  // Queue events
  "queue:added": { file: string; server: string };
  "queue:processing": { count: number };
  "queue:flushed": { count: number };

  // State events
  "state:changed": { type: string; payload: unknown };

  // UI events
  "ui:started": {};
  "ui:stopped": {};
  "ui:render": {};

  // Watcher events
  "watcher:started": { patterns: string[] };
  "watcher:stopped": {};
}

/**
 * Event type (keys of the event map)
 */
export type DenoburnerEventType = keyof DenoburnerEventMap;

/**
 * Event payload type (extracts the payload type for a given event)
 */
export type EventPayload<K extends DenoburnerEventType> = DenoburnerEventMap[K];
