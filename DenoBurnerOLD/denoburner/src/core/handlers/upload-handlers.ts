/**
 * Upload Event Handlers
 * 
 * Handlers for upload-related events.
 * Extracted from EventMediator for better separation of concerns.
 */

import type { IEventHandler } from "./interfaces.ts";
import type { UploadStartPayload, UploadSuccessPayload, UploadErrorPayload } from "./interfaces.ts";
import type { DenoburnerStateStore, FileCache, TrackedFile } from "../../state/index.ts";
import type { TuiFacade } from "../../tui/index.ts";
import type { CategoryLogger } from "../../logger/interfaces/index.ts";

/**
 * Dependencies for upload handlers
 */
export interface UploadHandlerDeps {
  stateStore: DenoburnerStateStore;
  fileCache: FileCache;
  tui: TuiFacade;
  log: CategoryLogger;
}

/**
 * Handler for upload start events
 */
export class UploadStartHandler implements IEventHandler<UploadStartPayload> {
  readonly name = "upload:start";

  constructor(private deps: UploadHandlerDeps) {}

  handle(payload: UploadStartPayload): void {
    const { log } = this.deps;
    log.debug(`Starting upload: ${payload.server}/${payload.file}`);
  }
}

/**
 * Handler for upload success events
 */
export class UploadSuccessHandler implements IEventHandler<UploadSuccessPayload> {
  readonly name = "upload:success";

  constructor(private deps: UploadHandlerDeps) {}

  handle(payload: UploadSuccessPayload): void {
    const { stateStore, fileCache, tui, log } = this.deps;
    const { result } = payload;

    const ramStr = result.ramUsage !== undefined ? ` (${result.ramUsage.toFixed(2)} GB)` : "";
    const bundleStr = result.bundled ? ` (bundled: ${result.bundledDeps} deps)` : "";
    log.success(`Uploaded: ${result.server}/${result.filename}${ramStr}${bundleStr}`);

    // Update file cache with uploaded content
    if (result.content && result.sourceFile) {
      fileCache.markUploaded(result.sourceFile, result.server, result.filename, result.content);
    }

    const trackedFile: TrackedFile = {
      path: result.filename,
      server: result.server,
      filename: result.filename,
      hash: "",
      ramUsage: result.ramUsage,
      bundled: result.bundled,
      bundledDeps: result.bundledDeps,
      lastUploaded: new Date(),
    };
    stateStore.dispatch({ type: "files/uploaded", file: trackedFile });

    // Update TUI stats
    this.updateTuiStats();

    // Update upload statistics
    const tuiState = tui.stateStore.getState().files;
    tui.updateUploadStats({ successCount: tuiState.successCount + 1 });
  }

  private updateTuiStats(): void {
    const { stateStore, tui } = this.deps;
    const state = stateStore.getState();
    tui.updateStats({
      watched: state.files.watched,
      uploaded: state.files.uploaded,
      totalRam: state.files.totalRam,
      lastUpload: state.files.lastUpload,
      list: state.files.list,
    });
  }
}

/**
 * Handler for upload error events
 */
export class UploadErrorHandler implements IEventHandler<UploadErrorPayload> {
  readonly name = "upload:error";

  constructor(private deps: UploadHandlerDeps) {}

  handle(payload: UploadErrorPayload): void {
    const { tui, log } = this.deps;
    const { file, server, error } = payload;

    log.error(`Failed to upload ${server}/${file}: ${error.message}`);

    // Update upload statistics
    const tuiState = tui.stateStore.getState().files;
    tui.updateUploadStats({ errorCount: tuiState.errorCount + 1 });
  }
}

/**
 * Create all upload handlers
 */
export function createUploadHandlers(deps: UploadHandlerDeps): IEventHandler<unknown>[] {
  return [
    new UploadStartHandler(deps),
    new UploadSuccessHandler(deps),
    new UploadErrorHandler(deps),
  ];
}
