import { defineCommand } from "citty";
import { resolve, basename } from "@std/path";
import { Logger } from "../../logger/logger.ts";
import { ConsoleTransport } from "../../logger/console_transport.ts";
import { RpcCommandExecutor } from "../../rpc/command.ts";
import { PushFileCommand } from "../../rpc/commands/push_file_command.ts";
import { loadConfig } from "../../config/loader.ts";
import { connectRpcClient } from "../../cli/connect.ts";
import { toDenoburnerError } from "../../core/errors.ts";

export default defineCommand({
  meta: {
    name: "exec",
    description: "Push a script to a game server, execute it, and print output",
  },
  args: {
    script: { type: "positional", description: "Path to local script", required: true },
    server: { type: "string", default: "home", description: "Target server" },
    port: { type: "string", default: "12525", description: "WS port" },
    host: { type: "string", default: "localhost", description: "WS host" },
    args: { type: "string", description: "Comma-separated script arguments" },
    config: { type: "string", alias: "c", description: "Path to config file" },
  },
  async run({ args }) {
    const config = await loadConfig(args.config);
    const logger = new Logger();
    logger.addTransport(new ConsoleTransport(true));

    const scriptPath = resolve(args.script);
    const content = await Deno.readTextFile(scriptPath);
    const filename = basename(scriptPath);
    const targetServer = args.server || config.defaultServer || "home";

    const { rpcClient, close } = await connectRpcClient(
      args.host || config.host || "localhost",
      parseInt(args.port) || config.port || 12525,
      logger,
      120_000,
    );

    try {
      const executor = new RpcCommandExecutor(rpcClient, logger);
      const pushCmd = new PushFileCommand({
        filename,
        content,
        server: targetServer,
      });
      await executor.execute(pushCmd);
      logger.info(`Pushed ${filename} to ${targetServer}`);

      const scriptArgs = args.args
        ? args.args.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0)
        : [];
      const result = await rpcClient.sendRequest("exec", {
        filename,
        server: targetServer,
        args: scriptArgs,
      });
      const output = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      console.log(output);
    } catch (err) {
      logger.error(`exec failed: ${toDenoburnerError(err).message}`);
      Deno.exit(1);
    } finally {
      close();
    }
  },
});
