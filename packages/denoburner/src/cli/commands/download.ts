import { defineCommand } from "citty";
import { normalize } from "@std/path";
import { ensureDir } from "@std/fs";
import { Logger } from "../../logger/logger.ts";
import { ConsoleTransport } from "../../logger/console_transport.ts";
import { WsClient } from "../../server/ws_client.ts";
import { RpcClient } from "../../rpc/client.ts";
import { PendingRequestMap } from "../../rpc/pending_requests.ts";
import { RpcDispatcher } from "../../rpc/dispatcher.ts";
import { loadConfig } from "../../config/loader.ts";
import type { DenoburnerConfig } from "../../config/types.ts";

interface FileEntry {
  filename: string;
  content: string;
}

function sanitizePath(base: string, ...rest: string[]): string {
  let joined = base;
  for (const segment of rest) {
    joined = joined + "/" + segment;
  }
  const normalized = normalize(joined);
  if (!normalized.startsWith(normalize(base))) {
    throw new Error(`Path traversal detected: ${joined}`);
  }
  return normalized;
}

export default defineCommand({
  meta: {
    name: "download",
    description: "Download all scripts from a game server to disk",
  },
  args: {
    server: { type: "string", default: "home", description: "In-game server to download from" },
    out: { type: "string", default: "./src", description: "Local output directory" },
    port: { type: "string", default: "12525", description: "WS port" },
    host: { type: "string", default: "localhost", description: "WS host" },
    config: { type: "string", alias: "c", description: "Path to config file" },
  },
  async run({ args }) {
    const config = await loadConfig(args.config);
    const targetServer = args.server || config.defaultServer || "home";
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
    const pending = new PendingRequestMap(30_000);
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
      logger.info(`Downloading files from "${targetServer}"...`);
      const files = await rpcClient.sendRequest("getAllFiles", {
        server: targetServer,
      }) as FileEntry[];

      // Try to fetch metadata for file info display
      let metadata: Array<{ filename: string; size: number; mtime?: number }> = [];
      try {
        metadata = await rpcClient.sendRequest("getAllFileMetadata", { server: targetServer }) as typeof metadata;
      } catch {
        // metadata not available, skip
      }
      const metaMap = new Map(metadata.map((m) => [m.filename, m]));

      const baseDir = sanitizePath(args.out);
      const outDir = sanitizePath(baseDir, targetServer);

      let count = 0;
      for (const file of files) {
        try {
          const filePath = sanitizePath(outDir, file.filename);
          const fileDir = filePath.substring(0, filePath.lastIndexOf("/"));
          await ensureDir(fileDir);
          await Deno.writeTextFile(filePath, file.content);
          count++;

          const meta = metaMap.get(file.filename);
          if (meta) {
            const size = meta.size ? ` (${meta.size} bytes)` : "";
            const time = meta.mtime ? ` [${new Date(meta.mtime).toLocaleString()}]` : "";
            logger.info(`  ${file.filename}${size}${time}`);
          } else {
            logger.info(`  ${file.filename} (${file.content.length} bytes)`);
          }
        } catch (err) {
          logger.error(`  Failed to write ${file.filename}: ${err}`);
        }
      }

      logger.success(`Downloaded ${count} files to ${outDir}`);
    } catch (err) {
      logger.error(`Download failed: ${err}`);
    } finally {
      client.close();
    }
  },
});
