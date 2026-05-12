export interface ServerFile {
  name: string;
  ram: number;
}

export interface TuiStats {
  status: "connected" | "disconnected" | "waiting";
  host: string;
  port: number;
  uptimeSeconds: number;
  filesUploaded: number;
  errors: number;
  skipCount: number;
  servers: Map<string, ServerFile[]>;
  queuePending: number;
  queueFailed: number;
  watchedCount: number;
  totalRam: number;
  expandedServers: Set<string>;
  logLevelFilter: string;
  lastUploadTime: number;
  depGraphSize: number;
  cascadeDepth: number;
}

export interface LogEntry {
  timestamp: Date;
  level: "debug" | "info" | "success" | "warn" | "error";
  message: string;
  category?: string;
}

export interface RenderContext {
  width: number;
  height: number;
  stats: TuiStats;
  logs: LogEntry[];
  showHelp?: boolean;
}

export interface ITuiComponent {
  render(ctx: RenderContext): string[];
}

export type TuiEvent =
  | { type: "file_uploaded"; filename: string; server: string; ram: number; durationMs: number }
  | { type: "file_error"; filename: string; server: string; error: string }
  | { type: "file_skipped"; filename: string; reason: string }
  | { type: "client_connected"; clientId: string }
  | { type: "client_disconnected"; clientId: string }
  | { type: "queue_update"; pending: number; failed: number; processing: boolean; offline: boolean };

export interface ITuiEventBus {
  emit(event: TuiEvent): void;
  on(handler: (event: TuiEvent) => void): void;
  off(handler: (event: TuiEvent) => void): void;
}

export interface ITuiRenderer {
  start(): void;
  stop(): void;
  updateStats(stats: TuiStats): void;
  appendLog(entry: LogEntry): void;
  clearLogs(): void;
  requestRender(): void;
  cycleExpand(): void;
  cycleFilter(): void;
  cycleHelp(): void;
  stats: TuiStats;
}
