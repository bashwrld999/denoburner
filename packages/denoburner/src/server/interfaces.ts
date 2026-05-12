export interface IClientConnection {
  readonly id: string;
  send(data: string): void;
  close(): void;
}

export interface IServer {
  readonly port: number;
  readonly host: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  onConnection(handler: (client: IClientConnection) => void): void;
}

export interface IWsClient {
  connect(url: string): Promise<void>;
  send(data: string): Promise<void>;
  onMessage(handler: (data: string) => void): void;
  close(): void;
}
