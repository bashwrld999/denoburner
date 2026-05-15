import type { DenoburnerConfig } from "./config/types.ts";
import type { ILogger } from "./logger/interfaces.ts";
import type { IRpcClient } from "./rpc/client.ts";

import { RpcDispatcher } from "./rpc/dispatcher.ts";
import { RpcClient } from "./rpc/client.ts";
import { PendingRequestMap } from "./rpc/pending_requests.ts";
import { RpcCommandExecutor } from "./rpc/command.ts";
import { WebSocketServer } from "./server/websocket_server.ts";
import { TuiEventBus } from "./tui/event_bus.ts";
import { FileCache, createFileCache } from "./state/cache.ts";
import { toDenoburnerError } from "./core/errors.ts";
import { UploadQueueManager } from "./state/queue.ts";
import { PushFileCommand } from "./rpc/commands/push_file_command.ts";

export interface DevEnvironment {
  server: WebSocketServer;
  rpcClient: IRpcClient;
  eventBus: TuiEventBus;
  commandExecutor: RpcCommandExecutor;
  cache: FileCache;
  uploadQueue: UploadQueueManager;
  pendingRequests: PendingRequestMap;
}

const noopLogger: ILogger = {
  info() {},
  success() {},
  warn() {},
  error() {},
  child() { return noopLogger; },
};

export function createDevEnvironment(
  config: DenoburnerConfig,
  logger: ILogger,
  queueLog?: ILogger,
): DevEnvironment {
  const eventBus = new TuiEventBus(logger);
  const pending = new PendingRequestMap(config.timeout ?? 30_000);
  const dispatcher = new RpcDispatcher(pending, logger);
  const rpcClient = new RpcClient(pending, logger);
  const commandExecutor = new RpcCommandExecutor(rpcClient, logger, 2);
  const cache = createFileCache();
  const uploadQueue = new UploadQueueManager();
  const ql = queueLog ?? noopLogger;

  uploadQueue.setProcessor(async (item) => {
    try {
      const command = new PushFileCommand({
        filename: item.gameFilename,
        content: item.content,
        server: item.gameServer,
      });
      ql.info(`Processing queued upload: ${item.gameFilename}`);
      await commandExecutor.execute(command);
      await cache.markUploaded(item.filePath, item.gameServer, item.gameFilename, item.content);
      const qs = uploadQueue.getStats();
      eventBus.emit({ type: "queue_update", ...qs });
      ql.success(`Successfully uploaded: ${item.gameFilename}`);
      return true;
    } catch (err) {
      const qs = uploadQueue.getStats();
      eventBus.emit({ type: "queue_update", ...qs });
      ql.warn(`Upload failed: ${item.gameFilename} - ${toDenoburnerError(err).message}`);
      return false;
    }
  });

  const server = new WebSocketServer({
    host: config.host ?? "localhost",
    port: config.port ?? 12525,
    logger,
  });

  server.onConnection((client) => {
    rpcClient.setSender(client);
    eventBus.emit({ type: "client_connected", clientId: client.id });
  });

  server.onMessage((data, senderClient) => {
    dispatcher.dispatch(data, {
      send: (msg) => senderClient.send(msg),
    });
  });

  server.onDisconnect((client) => {
    const active = server.getActiveClient();
    if (!active) {
      rpcClient.setSender(null);
      uploadQueue.setOffline(true);
    }
    eventBus.emit({ type: "client_disconnected", clientId: client.id });
  });

  return { server, rpcClient, eventBus, commandExecutor, cache, uploadQueue, pendingRequests: pending };
}
