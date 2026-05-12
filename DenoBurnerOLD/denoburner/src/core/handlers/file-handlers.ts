/**
 * File Event Handlers
 * 
 * Handlers for file-related events.
 * Extracted from EventMediator for better separation of concerns.
 */

import type { IEventHandler } from "./interfaces.ts";
import type { FileCreatedPayload, FileModifiedPayload, FileDeletedPayload } from "./interfaces.ts";
import type { HmrData } from "../../types.ts";
import type { UploaderOrchestrator } from "../../uploader/index.ts";
import type { DenoburnerStateStore, FileCache, UploadQueueManager } from "../../state/index.ts";
import type { TuiFacade } from "../../tui/index.ts";
import type { WatcherImpl, DependencyGraph, HmrBatcher } from "../../watcher/index.ts";
import type { DependencyAnalyzer } from "../../analyzer/index.ts";
import type { CategoryLogger } from "../../logger/interfaces/index.ts";

/**
 * Dependencies for file handlers
 */
export interface FileHandlerDeps {
  uploader: UploaderOrchestrator;
  stateStore: DenoburnerStateStore;
  fileCache: FileCache;
  uploadQueue: UploadQueueManager;
  tui: TuiFacade;
  watcher: WatcherImpl;
  dependencyAnalyzer?: DependencyAnalyzer;
  dependencyGraph?: DependencyGraph;
  hmrBatcher?: HmrBatcher;
  log: CategoryLogger;
}

/**
 * Base class for file change handlers
 */
abstract class FileChangeHandler implements IEventHandler<HmrData> {
  abstract readonly name: string;

  constructor(protected deps: FileHandlerDeps) {}

  async handle(data: HmrData): Promise<void> {
    await this.handleFileChange(data);
  }

  /**
   * Handle file change event
   */
  protected async handleFileChange(data: HmrData): Promise<void> {
    const { uploader, stateStore, fileCache, uploadQueue, tui, log } = this.deps;
    const isConnected = stateStore.getState().connection.connected;

    // For cascade-only files, just analyze dependencies but don't upload
    if (data.cascadeOnly) {
      log.debug(`Cascade-only file changed: ${data.file}`);
      await this.analyzeDependencies(data, data.location(data.file));
      return; // Don't upload
    }

    if (!isConnected) {
      uploadQueue.enqueue(data);
      log.warn(`Queued (offline): ${data.file}`);
      return;
    }

    // Check if file content has changed
    const locations = data.location(data.file);
    let needsUpload = true;

    for (const { filename, server } of locations) {
      const changed = await fileCache.needsUpload(data.file, server, filename);
      if (!changed) {
        needsUpload = false;
        break;
      }
    }

    if (!needsUpload) {
      log.info(`Skipped (unchanged): ${data.file}`);
      // Update skipped counter in TUI
      const tuiState = tui.stateStore.getState().files;
      tui.updateUploadStats({ skippedCount: tuiState.skippedCount + 1 });
      return;
    }

    // Analyze dependencies if cascading updates are enabled
    await this.analyzeDependencies(data, locations);

    try {
      await uploader.uploadFile(data);
    } catch (error) {
      log.error(`Failed to upload ${data.file}: ${error}`);
    }
  }

  /**
   * Analyze and update dependency graph
   */
  private async analyzeDependencies(data: HmrData, locations: Array<{ filename: string; server: string }>): Promise<void> {
    const { dependencyAnalyzer, dependencyGraph, log } = this.deps;

    // Always analyze if we have the tools, even for cascade-only files
    if (dependencyAnalyzer && dependencyGraph) {
      try {
        const fileInfo = await dependencyAnalyzer.analyze(data.file);
        // For cascade-only files, server is null since they're not uploaded
        const server = data.cascadeOnly ? null : (locations[0]?.server ?? "home");

        // Update dependency graph
        dependencyGraph.updateFromFile(data.file, fileInfo, server);
      } catch (error) {
        log.debug(`Failed to analyze dependencies for ${data.file}: ${error}`);
      }
    }
  }
}

/**
 * Handler for file created events
 */
export class FileCreatedHandler extends FileChangeHandler {
  readonly name = "file:created";

  constructor(deps: FileHandlerDeps) {
    super(deps);
  }
}

/**
 * Handler for file modified events
 */
export class FileModifiedHandler extends FileChangeHandler {
  readonly name = "file:modified";

  constructor(deps: FileHandlerDeps) {
    super(deps);
  }
}

/**
 * Handler for file deleted events
 */
export class FileDeletedHandler implements IEventHandler<FileDeletedPayload> {
  readonly name = "file:deleted";

  constructor(private deps: FileHandlerDeps) {}

  async handle(payload: FileDeletedPayload): Promise<void> {
    const { stateStore, uploader, log } = this.deps;
    const isConnected = stateStore.getState().connection.connected;

    if (!isConnected) {
      log.warn(`Skipped delete (offline): ${payload.file}`);
      return;
    }

    log.info(`File deleted: ${payload.server}/${payload.file}`);

    await uploader.deleteFile({
      file: payload.file,
      event: "delete",
      timestamp: Date.now(),
      pattern: "",
      transform: false,
      bundle: false,
      transpile: false,
      location: () => [{ filename: payload.file, server: payload.server }],
    });
  }
}

/**
 * Create all file handlers
 */
export function createFileHandlers(deps: FileHandlerDeps): IEventHandler<unknown>[] {
  return [
    new FileCreatedHandler(deps),
    new FileModifiedHandler(deps),
    new FileDeletedHandler(deps),
  ];
}
