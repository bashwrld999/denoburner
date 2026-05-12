/**
 * Download command
 * 
 * Downloads files from Bitburner to local filesystem.
 */

import { defineCommand } from "citty";
import { loadConfig } from "../../config/index.ts";
import { createRemoteApiServer } from "../../remote-api/index.ts";
import { join } from "jsr:@std/path";

/**
 * Ensure directory exists
 */
async function ensureDir(path: string): Promise<void> {
  try {
    await Deno.mkdir(path, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }
}

export default defineCommand({
  meta: {
    name: "download",
    description: "Downloads files from Bitburner to local filesystem.",
  },
  args: {
    server: {
      type: "string",
      description: "Server to download from",
      alias: "s",
    },
    overwrite: {
      type: "boolean",
      description: "Overwrite existing files",
      alias: "o",
    },
  },
  async run({ args }) {
    // Load configuration
    const config = await loadConfig();
    const servers = args.server ? [args.server] : config.download.servers;
    const overwrite = args.overwrite ?? false;

    console.log("Starting WebSocket server...");
    console.log("Waiting for Bitburner to connect...");
    console.log("Enable Remote API in Bitburner: Options > Remote API > Connect");

    // Initialize server using factory
    const server = createRemoteApiServer(config.port, config.timeout);

    // Start server
    await server.start();

    // Wait for connection
    try {
      await server.waitForConnection(60000);
      console.log("Bitburner connected!");
    } catch {
      console.error("Timeout waiting for Bitburner connection");
      server.stop();
      Deno.exit(1);
    }

    // Get the API for making calls
    const api = server.getApi();

    let downloaded = 0;
    let skipped = 0;
    let errors = 0;

    for (const serverName of servers) {
      console.log(`\nDownloading from ${serverName}...`);

      try {
        const files = await api.getAllFiles(serverName);

        for (const { filename, content } of files) {
          // Check if should skip
          if (config.download.ignoreTs && filename.endsWith(".ts")) {
            continue;
          }
          if (config.download.ignoreSourcemap && filename.endsWith(".map")) {
            continue;
          }

          // Determine output path
          const outputPath = config.download.location(filename, serverName);
          const absolutePath = join(Deno.cwd(), outputPath);

          // Check if file exists
          if (!overwrite) {
            try {
              await Deno.stat(absolutePath);
              console.log(`  Skipped: ${filename} (exists)`);
              skipped++;
              continue;
            } catch {
              // File doesn't exist, continue
            }
          }

          // Write file
          try {
            await ensureDir(join(absolutePath, ".."));
            await Deno.writeTextFile(absolutePath, content);
            console.log(`  Downloaded: ${filename}`);
            downloaded++;
          } catch (error) {
            console.error(`  Error: ${filename} - ${error}`);
            errors++;
          }
        }
      } catch (error) {
        console.error(`Failed to download from ${serverName}: ${error}`);
        errors++;
      }
    }

    server.stop();

    console.log(`\nDownload complete: ${downloaded} downloaded, ${skipped} skipped, ${errors} errors`);
  },
});
