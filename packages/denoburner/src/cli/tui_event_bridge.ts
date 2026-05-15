import type { ITuiEventBus, ITuiRenderer } from "../tui/interfaces.ts";
import type { ILogger } from "../logger/interfaces.ts";
import type { DevEnvironment } from "../environment.ts";
import { toDenoburnerError } from "../core/errors.ts";

export class TuiEventBridge {
  constructor(
    private renderer: ITuiRenderer,
    private env: DevEnvironment,
    private uploadLog: ILogger,
    private connectLog: ILogger,
    private cwd: string,
    private fetchTypes: boolean,
  ) {}

  setup(eventBus: ITuiEventBus): void {
    const S = this.renderer.stats;
    const { env, uploadLog, connectLog } = this;

    eventBus.on((event) => {
      switch (event.type) {
        case "file_uploaded": {
          S.filesUploaded++;
          S.totalRam += event.ram;
          S.lastUploadTime = Date.now();
          const files = S.servers.get(event.server) || [];
          files.push({ name: event.filename, ram: event.ram });
          if (files.length > 50) files.splice(0, files.length - 50);
          S.servers.set(event.server, files);
          uploadLog.success(`Uploaded: ${event.server}/${event.filename} (${event.ram.toFixed(2)} GB, ${event.durationMs}ms)`);
          break;
        }
        case "file_error": {
          S.errors++;
          uploadLog.error(`Failed to upload ${event.server}/${event.filename}: ${event.error}`);
          break;
        }
        case "file_skipped": {
          S.skipCount++;
          uploadLog.info(`Skipped (unchanged): ${event.filename}`);
          break;
        }
        case "client_connected": {
          S.status = "connected";
          env.uploadQueue.setOffline(false);
          connectLog.success("Bitburner connected!");
          if (this.fetchTypes) {
            env.rpcClient.sendRequest("getDefinitionFile").then((result) => {
              const content = typeof result === "string" ? result : (result as { content: string }).content;
              Deno.writeTextFileSync(this.cwd + "/NetscriptDefinitions.d.ts", content);
              connectLog.success("Downloaded NetscriptDefinitions.d.ts");
            }).catch((err) => {
              connectLog.warn(`Failed to download definition file: ${toDenoburnerError(err).message}`);
            });
          }
          break;
        }
        case "client_disconnected": {
          S.status = "disconnected";
          env.uploadQueue.setOffline(true);
          connectLog.warn("Bitburner disconnected");
          break;
        }
        case "queue_update": {
          S.queuePending = event.pending;
          S.queueFailed = event.failed;
          break;
        }
      }
    });
  }
}
