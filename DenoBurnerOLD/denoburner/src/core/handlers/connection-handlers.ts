/**
 * Connection Event Handlers
 * 
 * Handlers for connection-related events.
 * Extracted from EventMediator for better separation of concerns.
 */

import type { IEventHandler, ConnectionHandlerContext } from "./interfaces.ts";
import type { ConnectionStateChangedPayload, ConnectionConnectedPayload, ConnectionDisconnectedPayload } from "./interfaces.ts";
import type { RemoteApiServer } from "../../remote-api/index.ts";
import type { DenoburnerStateStore, UploadQueueManager, FileCache } from "../../state/index.ts";
import type { TuiFacade } from "../../tui/index.ts";
import type { WatcherImpl } from "../../watcher/index.ts";
import type { UploaderOrchestrator } from "../../uploader/index.ts";
import type { ResolvedDenoBurnerConfig } from "../../config/types.ts";
import type { CategoryLogger } from "../../logger/interfaces/index.ts";

/**
 * Dependencies for connection handlers
 */
export interface ConnectionHandlerDeps {
  server: RemoteApiServer;
  stateStore: DenoburnerStateStore;
  uploadQueue: UploadQueueManager;
  tui: TuiFacade;
  watcher: WatcherImpl;
  uploader: UploaderOrchestrator;
  fileCache: FileCache;
  config: ResolvedDenoBurnerConfig;
  log: CategoryLogger;
  /** Callback to perform initial upload */
  doInitialUpload: () => Promise<void>;
}

/**
 * Handler for connection state changed events
 */
export class ConnectionStateChangedHandler implements IEventHandler<ConnectionStateChangedPayload> {
  readonly name = "connection:stateChanged";

  constructor(
    private deps: ConnectionHandlerDeps,
  ) {}

  handle(payload: ConnectionStateChangedPayload): void {
    const { state, port } = payload;
    const { stateStore, log } = this.deps;

    stateStore.dispatch({
      type: "connection/stateChanged",
      state,
    });

    if (state === "listening") {
      log.info(`WebSocket server listening on port ${port}`);
      log.info("Waiting for Bitburner to connect...");
      log.info("Enable Remote API in Bitburner: Options > Remote API > Connect");
    }
  }
}

/**
 * Handler for connection established events
 */
export class ConnectionConnectedHandler implements IEventHandler<ConnectionConnectedPayload> {
  readonly name = "connection:connected";

  constructor(
    private deps: ConnectionHandlerDeps,
  ) {}

  async handle(payload: ConnectionConnectedPayload): Promise<void> {
    const { port } = payload;
    const { server, stateStore, uploadQueue, tui, config, log, doInitialUpload } = this.deps;

    stateStore.dispatch({ type: "connection/connected", port });
    log.success("Bitburner connected!");

    // Update TUI connection state
    tui.setConnected(true, port);

    // Download definition file
    const api = server.getApi();
    api.getDefinitionFile()
      .then((definition: string) => {
        const definitionPath = "NetscriptDefinitions.d.ts";
        Deno.writeTextFileSync(definitionPath, definition);
        log.success(`Downloaded ${definitionPath}`);
      })
      .catch((error: Error) => {
        log.warn(`Failed to download definition file: ${error.message}`);
      });

    // Process queued uploads
    uploadQueue.setOffline(false);

    // Do initial upload if not ignored
    if (!config.ignoreInitial) {
      await doInitialUpload();
    }
  }
}

/**
 * Handler for connection lost events
 */
export class ConnectionDisconnectedHandler implements IEventHandler<ConnectionDisconnectedPayload> {
  readonly name = "connection:disconnected";

  constructor(
    private deps: ConnectionHandlerDeps,
  ) {}

  handle(_payload: ConnectionDisconnectedPayload): void {
    const { stateStore, uploadQueue, tui, config, log } = this.deps;

    stateStore.dispatch({ type: "connection/disconnected" });
    uploadQueue.setOffline(true);

    // Update TUI connection state
    tui.setConnected(false, config.port);

    log.warn("Bitburner disconnected");
  }
}

/**
 * Create all connection handlers
 */
export function createConnectionHandlers(deps: ConnectionHandlerDeps): IEventHandler<unknown>[] {
  return [
    new ConnectionStateChangedHandler(deps),
    new ConnectionConnectedHandler(deps),
    new ConnectionDisconnectedHandler(deps),
  ];
}
