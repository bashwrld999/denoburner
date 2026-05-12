import type { IWsClient } from "./interfaces.ts";
import type { ILogger } from "../logger/interfaces.ts";

export class WsClient implements IWsClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<(data: string) => void> = new Set();
  private disconnectHandlers: Set<() => void> = new Set();
  private reconnectHandlers: Set<() => void> = new Set();
  private logger: ILogger;
  private url = "";
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectAttempt = 0;
  private shouldReconnect = false;
  private closeRequested = false;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  connect(url: string): Promise<void> {
    this.url = url;
    this.shouldReconnect = true;
    this.closeRequested = false;
    this.reconnectAttempt = 0;
    return this.connectInternal(url);
  }

  private connectInternal(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
      } catch (err) {
        reject(err);
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`WebSocket connection timeout to ${url}`));
      }, 10_000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.reconnectAttempt = 0;
        this.logger.info(`Connected to ${url}`);
        this.startHeartbeat();
        for (const handler of this.reconnectHandlers) {
          try { handler(); } catch {}
        }
        resolve();
      };

      this.ws.onmessage = (event) => {
        for (const handler of this.messageHandlers) {
          try { handler(event.data as string); } catch {}
        }
      };

      this.ws.onerror = (err) => {
        clearTimeout(timeout);
        this.logger.error(`WebSocket error: ${err}`);
        reject(err);
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.logger.info("WebSocket disconnected");
        for (const handler of this.disconnectHandlers) {
          try { handler(); } catch {}
        }
        if (this.shouldReconnect && !this.closeRequested) {
          this.scheduleReconnect();
        }
      };
    });
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 30_000);
    this.reconnectAttempt++;
    this.logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectInternal(this.url).catch((err) => {
        this.logger.warn(`Reconnect attempt ${this.reconnectAttempt} failed: ${err}`);
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ jsonrpc: "2.0", method: "ping", id: 0 }));
        } catch {
          this.stopHeartbeat();
        }
      }
    }, 30_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  send(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not connected"));
        return;
      }
      this.ws.send(data);
      resolve();
    });
  }

  onMessage(handler: (data: string) => void): void {
    this.messageHandlers.add(handler);
  }

  onDisconnect(handler: () => void): void {
    this.disconnectHandlers.add(handler);
  }

  onReconnect(handler: () => void): void {
    this.reconnectHandlers.add(handler);
  }

  close(): void {
    this.closeRequested = true;
    this.shouldReconnect = false;
    this.stopHeartbeat();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
