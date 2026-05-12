import type { TuiStats } from "./interfaces.ts";

export const DEFAULT_TUI_STATS: TuiStats = {
  status: "waiting",
  host: "localhost",
  port: 12525,
  uptimeSeconds: 0,
  filesUploaded: 0,
  errors: 0,
  skipCount: 0,
  servers: new Map(),
  queuePending: 0,
  queueFailed: 0,
  watchedCount: 0,
  totalRam: 0,
  expandedServers: new Set(),
  logLevelFilter: "all",
  lastUploadTime: 0,
  depGraphSize: 0,
  cascadeDepth: 0,
};
