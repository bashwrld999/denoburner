import type { ILogger } from "../../src/logger/interfaces.ts";
import type { IRpcClient } from "../../src/rpc/client.ts";
import type { IMessageSender } from "../../src/rpc/types.ts";
import type { IClientConnection, IServer } from "../../src/server/interfaces.ts";
import type { IBundler, BundleResult } from "../../src/bundler/interface.ts";
import type { IFileWatcher, FileChangeEvent, WatchOptions } from "../../src/watcher/interface.ts";
import type { ITuiRenderer, TuiStats, LogEntry } from "../../src/tui/interfaces.ts";
import type { ITuiEventBus, TuiEvent } from "../../src/tui/interfaces.ts";
import type { IPipeline, PipelineContext, PipelineStage } from "../../src/pipeline/types.ts";

// ── Logger ──────────────────────────────────────────────
export class MockLogger implements ILogger {
  messages: Array<{ level: string; message: string }> = [];

  info(message: string): void { this.messages.push({ level: "info", message }); }
  success(message: string): void { this.messages.push({ level: "success", message }); }
  warn(message: string): void { this.messages.push({ level: "warn", message }); }
  error(message: string): void { this.messages.push({ level: "error", message }); }
  child(): ILogger { return this; }

  assertNoErrors(): void {
    const errors = this.messages.filter((m) => m.level === "error");
    if (errors.length > 0) throw new Error(`Unexpected errors: ${errors.map((e) => e.message).join(", ")}`);
  }
}

// ── RPC ─────────────────────────────────────────────────
export class MockRpcClient implements IRpcClient {
  requests: Array<{ method: string; params?: unknown }> = [];

  async sendRequest<T = unknown>(_method: string, _params?: unknown): Promise<T> {
    this.requests.push({ method: _method, params: _params });
    return Promise.resolve({} as T);
  }
}

export class MockSender implements IMessageSender {
  messages: string[] = [];
  send(msg: string): void { this.messages.push(msg); }
}

// ── Server ──────────────────────────────────────────────
export class MockConnection implements IClientConnection {
  readonly id: string;
  sent: string[] = [];

  constructor(id?: string) {
    this.id = id ?? "mock-conn";
  }

  send(data: string): void { this.sent.push(data); }
  close(): void {}
}

export class MockServer implements IServer {
  readonly port: number = 0;
  readonly host: string = "localhost";
  started = false;
  stopped = false;
  connectionHandlers: Array<(client: IClientConnection) => void> = [];
  messageHandlers: Array<(data: string, client: IClientConnection) => void> = [];
  disconnectHandlers: Array<(client: IClientConnection) => void> = [];
  activeClient: IClientConnection | null = new MockConnection();

  async start(): Promise<void> { this.started = true; }
  async stop(): Promise<void> { this.stopped = true; }

  onConnection(handler: (client: IClientConnection) => void): void { this.connectionHandlers.push(handler); }
  onMessage(handler: (data: string, client: IClientConnection) => void): void { this.messageHandlers.push(handler); }
  onDisconnect(handler: (client: IClientConnection) => void): void { this.disconnectHandlers.push(handler); }
  getActiveClient(): IClientConnection | null { return this.activeClient; }

  simulateConnection(): IClientConnection {
    const client = new MockConnection();
    for (const h of this.connectionHandlers) h(client);
    return client;
  }

  simulateDisconnect(client: IClientConnection): void {
    for (const h of this.disconnectHandlers) h(client);
  }
}

// ── Bundler ─────────────────────────────────────────────
export class MockBundler implements IBundler {
  bundleCalls: Array<{ path: string; content: string }> = [];

  async bundle(path: string, content: string, _serverRoot: string): Promise<BundleResult> {
    this.bundleCalls.push({ path, content });
    return { code: content };
  }

  async transpile(path: string, content: string): Promise<BundleResult> {
    this.bundleCalls.push({ path, content });
    return { code: content };
  }

  passthrough(content: string): BundleResult {
    return { code: content };
  }

  async close(): Promise<void> {}
}

// ── Watcher ─────────────────────────────────────────────
export class MockWatcher implements IFileWatcher {
  watchCalls: Array<{ paths: string[]; options?: WatchOptions }> = [];
  changeHandlers: Set<(event: FileChangeEvent) => void> = new Set();

  watch(paths: string[], options?: WatchOptions): void {
    this.watchCalls.push({ paths, options });
  }

  onChange(handler: (event: FileChangeEvent) => void): void {
    this.changeHandlers.add(handler);
  }

  close(): void {}

  simulateEvent(event: FileChangeEvent): void {
    for (const h of this.changeHandlers) h(event);
  }
}

// ── TUI Renderer ────────────────────────────────────────
export class MockRenderer implements ITuiRenderer {
  stats: TuiStats = {
    status: "disconnected",
    host: "",
    port: 0,
    uptimeSeconds: 0,
    filesUploaded: 0,
    errors: 0,
    skipCount: 0,
    servers: new Map(),
    queuePending: 0,
    queueFailed: 0,
    watchedCount: 0,
    totalRam: 0,
    expandedServers: new Set(),
    logLevelFilter: "info",
    lastUploadTime: 0,
    depGraphSize: 0,
    cascadeDepth: 0,
  };
  logs: LogEntry[] = [];
  started = false;
  stopped = false;

  start(): void { this.started = true; }
  stop(): void { this.stopped = true; }
  requestRender(): void {}
  updateStats(stats: TuiStats): void { this.stats = stats; }
  clearLogs(): void { this.logs = []; }
  appendLog(entry: LogEntry): void { this.logs.push(entry); }
  cycleExpand(): void {}
  cycleFilter(): void {}
  cycleHelp(): void {}

  assertNoErrors(): void {
    const errs = this.logs.filter((l) => l.level === "error");
    if (errs.length > 0) throw new Error(`Unexpected error logs: ${errs.map((e) => e.message).join(", ")}`);
  }
}

// ── Event Bus ───────────────────────────────────────────
export class MockEventBus implements ITuiEventBus {
  handlers: Array<(event: TuiEvent) => void> = [];
  emitted: TuiEvent[] = [];

  on(handler: (event: TuiEvent) => void): void {
    this.handlers.push(handler);
  }

  off(handler: (event: TuiEvent) => void): void {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  emit(event: TuiEvent): void {
    this.emitted.push(event);
    for (const h of this.handlers) h(event);
  }
}

// ── Pipeline ────────────────────────────────────────────
export class MockPipeline implements IPipeline {
  runCalls: PipelineContext[] = [];
  runAllCalls: PipelineContext[][] = [];

  use(_stage: PipelineStage): IPipeline { return this; }

  async run(ctx: PipelineContext): Promise<PipelineContext> {
    this.runCalls.push(ctx);
    return ctx;
  }

  async runAll(contexts: PipelineContext[]): Promise<PipelineContext[]> {
    this.runAllCalls.push(contexts);
    return contexts;
  }
}

export class MockStage implements PipelineStage {
  readonly name: string;
  executeCalls: PipelineContext[] = [];
  private fn?: (ctx: PipelineContext) => Promise<void>;

  constructor(name: string, fn?: (ctx: PipelineContext) => Promise<void>) {
    this.name = name;
    this.fn = fn;
  }

  async execute(ctx: PipelineContext): Promise<void> {
    this.executeCalls.push(ctx);
    await this.fn?.(ctx);
  }
}

// ── DevEnvironment parts ────────────────────────────────
import { UploadQueueManager } from "../../src/state/queue.ts";
import { PendingRequestMap } from "../../src/rpc/pending_requests.ts";
import { RpcCommandExecutor } from "../../src/rpc/command.ts";
import { FileCache } from "../../src/state/cache.ts";
import { TuiEventBus } from "../../src/tui/event_bus.ts";
import type { DevEnvironment } from "../../src/environment.ts";

export function makeMockEnv(): DevEnvironment {
  return {
    server: new MockServer(),
    rpcClient: new MockRpcClient(),
    commandExecutor: new RpcCommandExecutor(new MockRpcClient(), new MockLogger(), 0),
    eventBus: new TuiEventBus(),
    cache: new FileCache(),
    uploadQueue: new UploadQueueManager({ maxRetries: 0, baseDelayMs: 10 }),
    pendingRequests: new PendingRequestMap(),
  };
}
