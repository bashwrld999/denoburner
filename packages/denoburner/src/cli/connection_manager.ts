import type { DevEnvironment } from "../environment.ts";
import type { ILogger } from "../logger/interfaces.ts";

export interface ConnectionEvents {
  onConnect: (clientId: string) => void;
  onDisconnect: () => void;
}

export class ConnectionManager {
  private connected = false;
  private clientId = "";
  private connectHandlers: Array<(clientId: string) => void> = [];
  private disconnectHandlers: Array<() => void> = [];

  constructor(
    private env: DevEnvironment,
    private logger: ILogger,
  ) {
    this.setupListeners();
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get currentClientId(): string {
    return this.clientId;
  }

  onConnect(handler: (clientId: string) => void): void {
    this.connectHandlers.push(handler);
  }

  onDisconnect(handler: () => void): void {
    this.disconnectHandlers.push(handler);
  }

  async start(): Promise<void> {
    try {
      await this.env.server.start();
      this.logger.info("WebSocket server started");
    } catch (err) {
      const msg = String(err);
      if (msg.includes("EADDRINUSE") || msg.includes("Address already in use") || msg.includes("address in use") || msg.includes("os error 98")) {
        const port = (this.env.server as unknown as Record<string, unknown>).port ?? "?";
        this.logger.error(`Port ${port} is already in use. Try: denoburner dev --port ${Number(port) + 1}`);
      }
      throw err;
    }
  }

  async stop(): Promise<void> {
    this.env.uploadQueue.setOffline(true);
    this.env.pendingRequests.rejectAll(new Error("Connection shutting down"));
    await this.env.server.stop();
    this.env.uploadQueue.stop();
    this.connected = false;
    this.clientId = "";
  }

  async waitForConnection(): Promise<string> {
    if (this.connected) return this.clientId;
    return new Promise((resolve) => {
      this.onConnect((id) => resolve(id));
    });
  }

  private setupListeners(): void {
    this.env.eventBus.on((event) => {
      if (event.type === "client_connected") {
        this.connected = true;
        this.clientId = event.clientId;
        this.env.uploadQueue.setOffline(false);
        for (const h of this.connectHandlers) h(event.clientId);
      } else if (event.type === "client_disconnected") {
        this.connected = false;
        this.clientId = "";
        this.env.uploadQueue.setOffline(true);
        for (const h of this.disconnectHandlers) h();
      }
    });
  }
}
