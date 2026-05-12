/**
 * Interfaces Module
 * 
 * Defines contracts for all major components in the application.
 * These interfaces enable loose coupling and easy testing.
 */

import type { HmrData, UploadResult } from "../types.ts";
import type { ResolvedWatchItem, ThemeConfig } from "../config/types.ts";
import type { TuiStats } from "../tui/interfaces/event-bus.ts";
import type { LogLevel } from "../logger/interfaces/index.ts";
import type { UploaderStats } from "../uploader/types.ts";
import type { ConnectionState } from "../remote-api/types.ts";
import type { BundleMode, ProcessedFile } from "../bundler/types.ts";
import type { WatcherEventMap } from "../watcher/watcher.ts";
import type { UploaderEventMap } from "../uploader/uploader.ts";
import type { RemoteApiEventMap } from "../remote-api/server.ts";
import type { EventEmitter } from "../core/event-emitter.ts";

// Re-export types that serve as interfaces
export type {
  HmrData,
  UploadResult,
  ResolvedWatchItem,
  ThemeConfig,
  TuiStats,
  LogLevel,
  UploaderStats,
  ConnectionState,
  BundleMode,
  ProcessedFile,
};

/**
 * File Watcher Interface
 */
export interface IWatcher extends EventEmitter<WatcherEventMap> {
  readonly patterns: string[];
  init(): Promise<void>;
  getAllFiles(): Promise<string[]>;
  findItem(file: string): ResolvedWatchItem | undefined;
  isMatch(file: string, pattern: string): boolean;
}

/**
 * Remote API Server Interface
 */
export interface IRemoteApiServer extends EventEmitter<RemoteApiEventMap> {
  readonly state: ConnectionState;
  readonly isConnected: boolean;
  start(): Promise<void>;
  stop(): void;
  waitForConnection(timeout?: number): Promise<void>;
  pushFile(server: string, filename: string, content: string): Promise<void>;
  deleteFile(server: string, filename: string): Promise<void>;
  getFile(server: string, filename: string): Promise<{ content: string }>;
  getFileNames(server: string): Promise<string[]>;
  getScriptRam(server: string, filename: string): Promise<number>;
  getDefinitionFile(): Promise<string>;
}

/**
 * File Uploader Interface
 */
export interface IFileUploader extends EventEmitter<UploaderEventMap> {
  uploadFile(data: HmrData): Promise<UploadResult[]>;
  deleteFile(data: HmrData): Promise<void>;
  getStats(): UploaderStats;
  setFilesWatched(count: number): void;
}

/**
 * TUI Interface
 */
export interface ITui {
  start(): void;
  stop(): void;
  log(text: string, level?: LogLevel, category?: string): void;
  updateStats(stats: Partial<TuiStats>): void;
  clearConsole(): void;
}

/**
 * Bundler Interface
 */
export interface IBundler {
  processFile(
    filePath: string,
    bundleMode: BundleMode,
    server: string,
    transpile?: boolean
  ): Promise<ProcessedFile>;
}

/**
 * Dev Server Interface
 */
export interface IDevServer {
  start(): Promise<void>;
  stop(): void;
  readonly isRunning: boolean;
}
