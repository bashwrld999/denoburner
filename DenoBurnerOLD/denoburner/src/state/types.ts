/**
 * Unified State Types
 * 
 * Single source of truth for all application state.
 */

import type { LogEntry, LogLevel } from "../logger/interfaces/index.ts";

/**
 * Connection state
 */
export interface ConnectionState {
  /** Whether connected to Bitburner */
  connected: boolean;
  /** WebSocket server port */
  port: number;
  /** Connection state from state machine */
  state: "disconnected" | "listening" | "connected" | "error";
  /** Last connection time */
  lastConnected?: Date;
  /** Last disconnection time */
  lastDisconnected?: Date;
}

/**
 * File information for tracking
 */
export interface TrackedFile {
  /** File path relative to project root */
  path: string;
  /** Server to upload to */
  server: string;
  /** Output filename */
  filename: string;
  /** Content hash for change detection */
  hash: string;
  /** RAM usage in GB */
  ramUsage?: number;
  /** Whether file was bundled */
  bundled?: boolean;
  /** Number of bundled dependencies */
  bundledDeps?: number;
  /** Last upload timestamp */
  lastUploaded?: Date;
  /** Last modification timestamp */
  lastModified?: Date;
}

/**
 * Files state
 */
export interface FilesState {
  /** Total files being watched */
  watched: number;
  /** Total files uploaded (all time) */
  uploaded: number;
  /** Total RAM usage in GB */
  totalRam: number;
  /** Last upload info */
  lastUpload: {
    filename: string;
    server: string;
    ram: number;
    timestamp: Date;
  } | null;
  /** Tracked files with details */
  tracked: Map<string, TrackedFile>;
  /** List of files for display (derived from tracked) */
  list: Array<{ filename: string; server: string; ram: number }>;
}

/**
 * Queue item for offline/retry support
 */
export interface QueuedUpload {
  /** Unique ID for this queue item */
  id: string;
  /** HMR data for the file */
  hmrData: import("../types.ts").HmrData;
  /** Number of retry attempts */
  retries: number;
  /** Max retries allowed */
  maxRetries: number;
  /** Error from last attempt */
  lastError?: Error;
  /** Timestamp when queued */
  queuedAt: Date;
  /** Timestamp of last attempt */
  lastAttempt?: Date;
}

/**
 * Upload queue state
 */
export interface QueueState {
  /** Items waiting to be uploaded */
  pending: QueuedUpload[];
  /** Items that failed and need retry */
  failed: QueuedUpload[];
  /** Whether queue is currently processing */
  processing: boolean;
  /** Whether offline mode is active */
  offline: boolean;
}

/**
 * UI state
 */
export interface UiState {
  /** Terminal width */
  width: number;
  /** Terminal height */
  height: number;
  /** Whether TUI is running */
  running: boolean;
  /** Whether console is focused (vs stats) */
  consoleFocused: boolean;
}

/**
 * Unified application state
 */
export interface DenoburnerState {
  /** Connection state */
  connection: ConnectionState;
  /** Files state */
  files: FilesState;
  /** Upload queue state */
  queue: QueueState;
  /** UI state */
  ui: UiState;
  /** Log entries */
  logs: LogEntry[];
}

/**
 * Initial state factory
 */
export function createInitialState(): DenoburnerState {
  return {
    connection: {
      connected: false,
      port: 12525,
      state: "disconnected",
    },
    files: {
      watched: 0,
      uploaded: 0,
      totalRam: 0,
      lastUpload: null,
      tracked: new Map(),
      list: [],
    },
    queue: {
      pending: [],
      failed: [],
      processing: false,
      offline: false,
    },
    ui: {
      width: 80,
      height: 24,
      running: false,
      consoleFocused: true,
    },
    logs: [],
  };
}

/**
 * State action types
 */
export type StateAction =
  | { type: "connection/connected"; port: number }
  | { type: "connection/disconnected" }
  | { type: "connection/stateChanged"; state: ConnectionState["state"] }
  | { type: "files/watched"; count: number }
  | { type: "files/uploaded"; file: TrackedFile }
  | { type: "files/deleted"; path: string; server: string }
  | { type: "files/ramUpdated"; path: string; server: string; ram: number }
  | { type: "queue/add"; item: QueuedUpload }
  | { type: "queue/remove"; id: string }
  | { type: "queue/retry"; id: string; error: Error }
  | { type: "queue/processing"; value: boolean }
  | { type: "queue/offline"; value: boolean }
  | { type: "ui/resize"; width: number; height: number }
  | { type: "ui/running"; value: boolean }
  | { type: "ui/focusConsole"; value: boolean }
  | { type: "logs/add"; entry: LogEntry }
  | { type: "logs/clear" };

/**
 * State reducer
 */
export function stateReducer(state: DenoburnerState, action: StateAction): DenoburnerState {
  switch (action.type) {
    case "connection/connected":
      return {
        ...state,
        connection: {
          ...state.connection,
          connected: true,
          port: action.port,
          state: "connected",
          lastConnected: new Date(),
        },
      };

    case "connection/disconnected":
      return {
        ...state,
        connection: {
          ...state.connection,
          connected: false,
          state: "disconnected",
          lastDisconnected: new Date(),
        },
      };

    case "connection/stateChanged":
      return {
        ...state,
        connection: {
          ...state.connection,
          state: action.state,
        },
      };

    case "files/watched":
      return {
        ...state,
        files: {
          ...state.files,
          watched: action.count,
        },
      };

    case "files/uploaded": {
      const key = `${action.file.server}:${action.file.path}`;
      const tracked = new Map(state.files.tracked);
      tracked.set(key, action.file);
      
      // Build list from tracked (most recent first, limit to 1000)
      const list = Array.from(tracked.values())
        .sort((a, b) => (b.lastUploaded?.getTime() ?? 0) - (a.lastUploaded?.getTime() ?? 0))
        .slice(0, 1000)
        .map(f => ({
          filename: f.filename,
          server: f.server,
          ram: f.ramUsage ?? 0,
        }));
      
      return {
        ...state,
        files: {
          ...state.files,
          uploaded: state.files.uploaded + 1,
          totalRam: action.file.ramUsage 
            ? state.files.totalRam + action.file.ramUsage 
            : state.files.totalRam,
          lastUpload: {
            filename: action.file.filename,
            server: action.file.server,
            ram: action.file.ramUsage ?? 0,
            timestamp: new Date(),
          },
          tracked,
          list,
        },
      };
    }

    case "files/deleted": {
      const key = `${action.server}:${action.path}`;
      const tracked = new Map(state.files.tracked);
      const existing = tracked.get(key);
      tracked.delete(key);
      
      // Rebuild list from tracked (limit to 1000)
      const list = Array.from(tracked.values())
        .sort((a, b) => (b.lastUploaded?.getTime() ?? 0) - (a.lastUploaded?.getTime() ?? 0))
        .slice(0, 1000)
        .map(f => ({
          filename: f.filename,
          server: f.server,
          ram: f.ramUsage ?? 0,
        }));
      
      return {
        ...state,
        files: {
          ...state.files,
          totalRam: existing?.ramUsage 
            ? state.files.totalRam - existing.ramUsage 
            : state.files.totalRam,
          tracked,
          list,
        },
      };
    }

    case "files/ramUpdated": {
      const key = `${action.server}:${action.path}`;
      const tracked = new Map(state.files.tracked);
      const existing = tracked.get(key);
      if (existing) {
        const oldRam = existing.ramUsage ?? 0;
        tracked.set(key, { ...existing, ramUsage: action.ram });
        return {
          ...state,
          files: {
            ...state.files,
            totalRam: state.files.totalRam - oldRam + action.ram,
            tracked,
          },
        };
      }
      return state;
    }

    case "queue/add":
      return {
        ...state,
        queue: {
          ...state.queue,
          pending: [...state.queue.pending, action.item],
        },
      };

    case "queue/remove":
      return {
        ...state,
        queue: {
          ...state.queue,
          pending: state.queue.pending.filter(item => item.id !== action.id),
          failed: state.queue.failed.filter(item => item.id !== action.id),
        },
      };

    case "queue/retry": {
      const item = state.queue.pending.find(i => i.id === action.id) 
        ?? state.queue.failed.find(i => i.id === action.id);
      if (!item) return state;
      
      const updatedItem: QueuedUpload = {
        ...item,
        retries: item.retries + 1,
        lastError: action.error,
        lastAttempt: new Date(),
      };
      
      // Move to failed if max retries exceeded
      if (updatedItem.retries >= updatedItem.maxRetries) {
        return {
          ...state,
          queue: {
            ...state.queue,
            pending: state.queue.pending.filter(i => i.id !== action.id),
            failed: [...state.queue.failed.filter(i => i.id !== action.id), updatedItem],
          },
        };
      }
      
      return {
        ...state,
        queue: {
          ...state.queue,
          pending: state.queue.pending.map(i => i.id === action.id ? updatedItem : i),
        },
      };
    }

    case "queue/processing":
      return {
        ...state,
        queue: {
          ...state.queue,
          processing: action.value,
        },
      };

    case "queue/offline":
      return {
        ...state,
        queue: {
          ...state.queue,
          offline: action.value,
        },
      };

    case "ui/resize":
      return {
        ...state,
        ui: {
          ...state.ui,
          width: action.width,
          height: action.height,
        },
      };

    case "ui/running":
      return {
        ...state,
        ui: {
          ...state.ui,
          running: action.value,
        },
      };

    case "ui/focusConsole":
      return {
        ...state,
        ui: {
          ...state.ui,
          consoleFocused: action.value,
        },
      };

    case "logs/add": {
      const logs = [...state.logs, action.entry];
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      return { ...state, logs };
    }

    case "logs/clear":
      return { ...state, logs: [] };

    default:
      return state;
  }
}
