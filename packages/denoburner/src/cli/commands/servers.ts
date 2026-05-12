import { defineCommand } from "citty";
import { Logger } from "../../logger/logger.ts";
import { ConsoleTransport } from "../../logger/console_transport.ts";
import { WsClient } from "../../server/ws_client.ts";
import { RpcClient } from "../../rpc/client.ts";
import { PendingRequestMap } from "../../rpc/pending_requests.ts";
import { RpcDispatcher } from "../../rpc/dispatcher.ts";
import { loadConfig } from "../../config/loader.ts";
import type { DenoburnerConfig } from "../../config/types.ts";

export default defineCommand({
  meta: {
    name: "servers",
    description: "List all servers with file counts and RAM usage (requires running dev instance)",
  },
  args: {
    port: { type: "string", default: "12525", description: "WS port" },
    host: { type: "string", default: "localhost", description: "WS host" },
    config: { type: "string", alias: "c", description: "Path to config file" },
  },
  async run({ args }) {
    const config = await loadConfig(args.config);
    const mergedConfig: DenoburnerConfig = {
      ...config,
      port: parseInt(args.port) || config.port,
      host: args.host || config.host,
    };

    const logger = new Logger();
    logger.addTransport(new ConsoleTransport(true));
    const wsUrl = `ws://${mergedConfig.host}:${mergedConfig.port}`;

    logger.info(`Connecting to ${wsUrl}...`);

    const client = new WsClient(logger);
    const pending = new PendingRequestMap(10_000);
    const dispatcher = new RpcDispatcher(pending, logger);
    const rpcClient = new RpcClient(
      { send: (msg) => client.send(msg) },
      pending,
      logger,
    );

    client.onMessage((data) => dispatcher.dispatch(data, {
      send: (msg) => client.send(msg),
    }));

    await client.connect(wsUrl);

    try {
      const servers = await rpcClient.sendRequest<string[]>("getAllServers");

      if (!servers || servers.length === 0) {
        logger.info("No servers found.");
        return;
      }

      const rows: Array<{ name: string; files: number; ram: string }> = [];

      for (const server of servers) {
        try {
          const fileNames = await rpcClient.sendRequest<string[]>("getFileNames", { server });
          const ramResult = await rpcClient.sendRequest<{ ram?: number }>("calculateRam", { server });
          const ram = ramResult?.ram ?? 0;
          rows.push({ name: server, files: fileNames?.length ?? 0, ram: ram.toFixed(2) + " GB" });
        } catch {
          rows.push({ name: server, files: 0, ram: "?" });
        }
      }

      // Find column widths for alignment
      const nameW = Math.max(...rows.map((r) => r.name.length), 8);
      const fileW = 8;
      const ramW = 10;

      const sep = `${"-".repeat(nameW + fileW + ramW + 6)}`;
      console.log(sep);
      console.log(
        `  ${"Server".padEnd(nameW)}  ${"Files".padEnd(fileW)}  ${"RAM".padEnd(ramW)}`,
      );
      console.log(sep);
      for (const r of rows) {
        console.log(
          `  ${r.name.padEnd(nameW)}  ${String(r.files).padEnd(fileW)}  ${r.ram.padEnd(ramW)}`,
        );
      }
      console.log(sep);
      logger.success(`${rows.length} server(s) found`);
    } catch (err) {
      logger.error(`Failed to list servers: ${err}`);
    } finally {
      client.close();
    }
  },
});
