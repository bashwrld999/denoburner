/**
 * Dev command
 * 
 * Starts the development server with hot reload and TUI.
 * Uses the createDevServer factory for dependency injection.
 */

import { defineCommand } from "citty";
import { loadConfig } from "../../config/index.ts";
import { createDevServer } from "../../factories/index.ts";

export default defineCommand({
  meta: {
    name: "dev",
    description: "Starts the dev server with hot reload and TUI.",
  },
  args: {
    port: {
      type: "string",
      description: "Port for WebSocket server",
      alias: "p",
    },
  },
  async run({ args }) {
    // Load configuration
    const config = await loadConfig();
    
    // Override port if provided via CLI
    if (args.port) {
      config.port = parseInt(args.port as string);
    }

    // Create dev server with dependency injection
    const { start, stop } = createDevServer(config);

    // Handle graceful shutdown
    const handleShutdown = () => {
      stop();
      Deno.exit(0);
    };

    Deno.addSignalListener("SIGINT", handleShutdown);
    Deno.addSignalListener("SIGTERM", handleShutdown);

    // Start the server
    await start();
  },
});
