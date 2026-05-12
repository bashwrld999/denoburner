/**
 * Built-in Event Flow Plugins
 *
 * Plugins for core event flows: connection, file, and upload.
 * These plugins reuse the handlers extracted in Phase 2.
 */

import type { IEventFlowPlugin, PluginContext } from "./interfaces.ts";
import type { IEventHandler, ConnectionHandlerDeps, FileHandlerDeps, UploadHandlerDeps } from "../handlers/index.ts";
import type { ConnectionState, DenoburnerEventMap } from "../events.ts";
import type { HmrData } from "../../types.ts";
import type { RemoteApiServer } from "../../remote-api/index.ts";
import type { UploaderOrchestrator } from "../../uploader/index.ts";
import type {
  DependencyGraph,
  HmrBatcher,
  WatcherImpl,
} from "../../watcher/index.ts";
import type {
  DenoburnerStateStore,
  FileCache,
  UploadQueueManager,
} from "../../state/index.ts";
import type { TuiFacade } from "../../tui/index.ts";
import type { ResolvedDenoBurnerConfig } from "../../config/types.ts";
import type { CategoryLogger, Logger } from "../../logger/interfaces/index.ts";
import type { DependencyAnalyzer } from "../../analyzer/index.ts";
import {
  createConnectionHandlers,
  createFileHandlers,
  createUploadHandlers,
} from "../handlers/index.ts";

/**
 * Dependencies for built-in plugins
 */
export interface BuiltinPluginDeps {
  server: RemoteApiServer;
  uploader: UploaderOrchestrator;
  watcher: WatcherImpl;
  tui: TuiFacade;
  stateStore: DenoburnerStateStore;
  fileCache: FileCache;
  uploadQueue: UploadQueueManager;
  config: ResolvedDenoBurnerConfig;
  dependencyAnalyzer?: DependencyAnalyzer;
  dependencyGraph?: DependencyGraph;
  hmrBatcher?: HmrBatcher;
  doInitialUpload: () => Promise<void>;
}

/**
 * Connection Event Flow Plugin
 *
 * Handles connection state changes, connections, and disconnections.
 * Reuses handlers from Phase 2.
 */
export class ConnectionEventPlugin implements IEventFlowPlugin {
  readonly name = "connection-events";
  readonly version = "1.0.0";
  readonly priority = 10; // Initialize first

  private handlers: Map<string, IEventHandler<unknown>> = new Map();
  private unsubscribers: (() => void)[] = [];

  constructor(private deps: BuiltinPluginDeps) {}

  initialize(context: PluginContext): void {
    const { eventBus, log, registerHandler, subscribe } = context;
    const serverLog = log.child("Server");
    const { server, config, doInitialUpload } = this.deps;

    // Create handler dependencies
    const handlerDeps: ConnectionHandlerDeps = {
      server: this.deps.server,
      stateStore: this.deps.stateStore,
      uploadQueue: this.deps.uploadQueue,
      tui: this.deps.tui,
      watcher: this.deps.watcher,
      uploader: this.deps.uploader,
      fileCache: this.deps.fileCache,
      config: this.deps.config,
      log: serverLog,
      doInitialUpload,
    };

    // Create and register handlers
    const handlers = createConnectionHandlers(handlerDeps);
    for (const handler of handlers) {
      this.handlers.set(handler.name, handler);
      registerHandler(handler);
    }

    // Wire server to event bus
    server.on({
      onStateChange: (state: string) => {
        eventBus.emit("connection:stateChanged", {
          state: state as ConnectionState,
          port: config.port,
        });
      },
      onConnection: () => {
        eventBus.emit("connection:connected", { port: config.port });
      },
      onDisconnection: () => {
        eventBus.emit("connection:disconnected", {});
      },
      onError: (error: Error) => {
        serverLog.error(`Connection error: ${error.message}`);
      },
    });

    // Subscribe to connection events using handlers
    this.unsubscribers.push(
      subscribe("connection:stateChanged", (payload) => {
        this.handlers.get("connection:stateChanged")?.handle(payload);
      }),
      subscribe("connection:connected", async (payload) => {
        await this.handlers.get("connection:connected")?.handle(payload);
      }),
      subscribe("connection:disconnected", (payload) => {
        this.handlers.get("connection:disconnected")?.handle(payload);
      }),
    );
  }

  dispose(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.handlers.clear();
  }
}

/**
 * File Event Flow Plugin
 *
 * Handles file creation, modification, and deletion events.
 * Uses handlers for core logic but handles batching internally.
 */
export class FileEventPlugin implements IEventFlowPlugin {
  readonly name = "file-events";
  readonly version = "1.0.0";
  readonly priority = 20; // After connection

  private handlers: Map<string, IEventHandler<unknown>> = new Map();
  private unsubscribers: (() => void)[] = [];

  constructor(private deps: BuiltinPluginDeps) {}

  initialize(context: PluginContext): void {
    const { eventBus, log, registerHandler, subscribe } = context;
    const watcherLog = log.child("Watcher");
    const { watcher, hmrBatcher } = this.deps;

    // Create handler dependencies
    const handlerDeps: FileHandlerDeps = {
      uploader: this.deps.uploader,
      stateStore: this.deps.stateStore,
      fileCache: this.deps.fileCache,
      uploadQueue: this.deps.uploadQueue,
      tui: this.deps.tui,
      watcher: this.deps.watcher,
      dependencyAnalyzer: this.deps.dependencyAnalyzer,
      dependencyGraph: this.deps.dependencyGraph,
      hmrBatcher: this.deps.hmrBatcher,
      log: watcherLog,
    };

    // Create and register handlers
    const handlers = createFileHandlers(handlerDeps);
    for (const handler of handlers) {
      this.handlers.set(handler.name, handler);
      registerHandler(handler);
    }

    // Wire watcher to event bus
    watcher.on("hmr", (data: HmrData) => {
      if (hmrBatcher) {
        hmrBatcher.addEvent(data);
      } else {
        if (data.event === "create") {
          eventBus.emit("file:created", data);
        } else if (data.event === "modify") {
          eventBus.emit("file:modified", data);
        } else if (data.event === "delete") {
          const locations = data.location(data.file);
          for (const { server, filename } of locations) {
            eventBus.emit("file:deleted", { file: filename, server });
          }
        }
      }
    });

    // Subscribe to file events using handlers
    this.unsubscribers.push(
      subscribe("file:created", async (data) => {
        await this.handlers.get("file:created")?.handle(data);
      }),
      subscribe("file:modified", async (data) => {
        await this.handlers.get("file:modified")?.handle(data);
      }),
      subscribe("file:deleted", async (data) => {
        await this.handlers.get("file:deleted")?.handle(data);
      }),
    );

    // Wire batcher if enabled
    if (hmrBatcher) {
      hmrBatcher.onBatch(async (batch) => {
        watcherLog.info(
          `Processing batch of ${batch.events.length} changes (${batch.affectedFiles.length} files affected)`,
        );

        // First handle delete events separately
        for (const event of batch.events) {
          if (event.event === "delete") {
            const locations = event.location(event.file);
            for (const { server, filename } of locations) {
              await this.handlers.get("file:deleted")?.handle(
                { file: filename, server },
              );
            }
          }
        }

        // Then handle non-delete events
        for (const affectedFile of batch.affectedFiles) {
          const event = batch.events.find((e) => e.file === affectedFile);

          // Skip delete events - they were handled above
          if (!event || event.event === "delete") {
            continue;
          }

          // Handle regular file changes via handler
          const handler = event.event === "create"
            ? this.handlers.get("file:created")
            : this.handlers.get("file:modified");
          await handler?.handle(event);
        }

        // Handle cascading updates for files not in the batch
        for (const affectedFile of batch.affectedFiles) {
          const event = batch.events.find((e) => e.file === affectedFile);

          // Only process cascading updates (files not in batch events)
          if (event) {
            continue;
          }

          // Cascading update
          const item = watcher.findItem(affectedFile);

          if (item) {
            const cascadingData: HmrData = {
              file: affectedFile,
              event: "modify",
              timestamp: Date.now(),
              pattern: item.pattern,
              transform: item.transform,
              bundle: item.bundle,
              transpile: item.transpile,
              location: item.location,
              cascadeOnly: true,
            };

            watcherLog.debug(`Cascading update: ${affectedFile}`);
            await this.handlers.get("file:modified")?.handle(cascadingData);
          }
        }
      });
    }
  }

  dispose(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.handlers.clear();
  }
}

/**
 * Upload Event Flow Plugin
 *
 * Handles upload success and error events.
 * Reuses handlers from Phase 2.
 */
export class UploadEventPlugin implements IEventFlowPlugin {
  readonly name = "upload-events";
  readonly version = "1.0.0";
  readonly priority = 30; // After file events

  private handlers: Map<string, IEventHandler<unknown>> = new Map();
  private unsubscribers: (() => void)[] = [];

  constructor(private deps: BuiltinPluginDeps) {}

  initialize(context: PluginContext): void {
    const { log, registerHandler } = context;
    const uploadLog = log.child("Upload");
    const { uploader, stateStore, fileCache, tui } = this.deps;

    // Create handler dependencies
    const handlerDeps: UploadHandlerDeps = {
      stateStore: this.deps.stateStore,
      fileCache: this.deps.fileCache,
      tui: this.deps.tui,
      log: uploadLog,
    };

    // Create and register handlers
    const handlers = createUploadHandlers(handlerDeps);
    for (const handler of handlers) {
      this.handlers.set(handler.name, handler);
      registerHandler(handler);
    }

    // Wire uploader to event bus
    uploader.on("upload:success", ({ result }) => {
      this.handlers.get("upload:success")?.handle({ result });
    });

    uploader.on("upload:error", ({ file, server, error }) => {
      this.handlers.get("upload:error")?.handle({ file, server, error });
    });

    uploader.on("delete:success", ({ file, server }) => {
      stateStore.dispatch({ type: "files/deleted", path: file, server });
      fileCache.remove(file, server);
      // Update TUI stats
      const state = stateStore.getState();
      tui.updateStats({
        watched: state.files.watched,
        uploaded: state.files.uploaded,
        totalRam: state.files.totalRam,
        lastUpload: state.files.lastUpload,
        list: state.files.list,
      });
    });
  }

  dispose(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.handlers.clear();
  }
}

/**
 * Queue Event Flow Plugin
 *
 * Handles upload queue processing.
 */
export class QueueEventPlugin implements IEventFlowPlugin {
  readonly name = "queue-events";
  readonly version = "1.0.0";
  readonly priority = 40; // Last

  constructor(private deps: BuiltinPluginDeps) {}

  initialize(_context: PluginContext): void {
    const { uploadQueue, uploader, tui } = this.deps;

    uploadQueue.setProcessor(async (item) => {
      try {
        const results = await uploader.uploadFile(item.hmrData);
        return results.every((r) => r.success);
      } catch {
        return false;
      }
    });

    uploadQueue.onStateChange((queue) => {
      tui.updateQueue({
        pending: queue.pending,
        items: queue.items.map((item) => ({
          file: item.hmrData.file,
          server: "home",
          timestamp: item.hmrData.timestamp,
        })),
      });
    });
  }
}

/**
 * Create all built-in plugins
 */
export function createBuiltinPlugins(
  deps: BuiltinPluginDeps,
): IEventFlowPlugin[] {
  return [
    new ConnectionEventPlugin(deps),
    new FileEventPlugin(deps),
    new UploadEventPlugin(deps),
    new QueueEventPlugin(deps),
  ];
}
