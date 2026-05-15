import { WsClient } from "../server/ws_client.ts";
import { RpcClient } from "../rpc/client.ts";
import { RpcDispatcher } from "../rpc/dispatcher.ts";
import { PendingRequestMap } from "../rpc/pending_requests.ts";
import type { ILogger } from "../logger/interfaces.ts";

export interface RpcConnection {
  client: WsClient;
  rpcClient: RpcClient;
  pending: PendingRequestMap;
  close(): void;
}

export async function connectRpcClient(
  host: string,
  port: number,
  logger: ILogger,
  timeoutMs: number = 30_000,
): Promise<RpcConnection> {
  const wsUrl = `ws://${host}:${port}`;
  logger.info(`Connecting to ${wsUrl}...`);

  const client = new WsClient(logger);
  const pending = new PendingRequestMap(timeoutMs);
  const dispatcher = new RpcDispatcher(pending, logger);
  const rpcClient = new RpcClient(pending, logger);

  client.onMessage((data) => {
    dispatcher.dispatch(data, {
      send: (msg: string) => client.send(msg),
    });
  });

  await client.connect(wsUrl);
  rpcClient.setSender({ send: (msg: string) => client.send(msg) });

  return {
    client,
    rpcClient,
    pending,
    close: () => client.close(),
  };
}
