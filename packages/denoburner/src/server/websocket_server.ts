import type { IServer, IClientConnection } from "./interfaces.ts";
import type { ILogger } from "../logger/interfaces.ts";

export interface WebSocketServerOptions {
  host: string;
  port: number;
  logger: ILogger;
}

class ClientConnection implements IClientConnection {
  readonly id: string;
  private socket: WebSocket;

  constructor(socket: WebSocket) {
    this.id = crypto.randomUUID();
    this.socket = socket;
  }

  send(data: string): void {
    try {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(data);
      }
    } catch {
      // socket closed between check and send
    }
  }

  close(): void {
    try {
      this.socket.close();
    } catch {
      // already closed
    }
  }
}

export class WebSocketServer implements IServer {
  readonly port: number;
  readonly host: string;
  private logger: ILogger;
  private controller: AbortController | null = null;
  private connectionHandlers: Set<(client: IClientConnection) => void> = new Set();
  private activeClients: Map<string, ClientConnection> = new Map();
  private serverInstance: ReturnType<typeof Deno.serve> | null = null;
  private started = false;

  constructor(options: WebSocketServerOptions) {
    this.host = options.host;
    this.port = options.port;
    this.logger = options.logger;
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.controller = new AbortController();
    const startedPromise = Promise.withResolvers<void>();

    this.serverInstance = Deno.serve({
      hostname: this.host,
      port: this.port,
      signal: this.controller.signal,
      onListen: ({ hostname, port }) => {
        this.logger.info(`WebSocket server listening on ${hostname}:${port}`);
        startedPromise.resolve();
      },
      onError: (err) => {
        this.logger.error(`Server error: ${err}`);
        startedPromise.reject(err);
        return new Response("Internal Server Error", { status: 500 });
      },
    }, (req) => {
      if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }

      const { socket, response } = Deno.upgradeWebSocket(req);

      const client = new ClientConnection(socket);
      this.activeClients.set(client.id, client);

      socket.onopen = () => {
        this.logger.info(`Client connected: ${client.id}`);
        for (const handler of this.connectionHandlers) {
          try { handler(client); } catch (e) { this.logger.error(`Connection handler error: ${e}`); }
        }
      };

      socket.onmessage = (event) => {
        for (const handler of this.messageHandlers) {
          try { handler(event.data as string, client); } catch (e) { this.logger.error(`Message handler error: ${e}`); }
        }
      };

      socket.onclose = () => {
        this.activeClients.delete(client.id);
        this.logger.info(`Client disconnected: ${client.id}`);
        for (const handler of this.disconnectHandlers) {
          try { handler(client); } catch (e) { this.logger.error(`Disconnect handler error: ${e}`); }
        }
      };

      socket.onerror = () => {
        // onclose will fire after onerror, handle cleanup there
      };

      return response;
    });

    await startedPromise.promise;
  }

  private messageHandlers: Set<(data: string, client: IClientConnection) => void> = new Set();
  private disconnectHandlers: Set<(client: IClientConnection) => void> = new Set();

  onMessage(handler: (data: string, client: IClientConnection) => void): void {
    this.messageHandlers.add(handler);
  }

  onConnection(handler: (client: IClientConnection) => void): void {
    this.connectionHandlers.add(handler);
  }

  onDisconnect(handler: (client: IClientConnection) => void): void {
    this.disconnectHandlers.add(handler);
  }

  getActiveClient(): IClientConnection | null {
    for (const client of this.activeClients.values()) {
      return client;
    }
    return null;
  }

  async stop(): Promise<void> {
    for (const client of this.activeClients.values()) {
      client.close();
    }
    this.activeClients.clear();
    this.controller?.abort();
    this.serverInstance = null;
    this.started = false;
  }
}
