/**
 * TUI Facade
 * 
 * Facade pattern for simplified TUI API.
 * Coordinates event bus, state store, renderer, and input handler.
 */

import type { EventBus, StateStore, Renderer, InputHandler, TuiComponent, TuiEvent, TuiState, KeyBinding, TuiStats } from "./interfaces/index.ts";
import type { LogEntry, LogLevel, LogTransport } from "../logger/interfaces/index.ts";
import type { ThemeConfig } from "../config/types.ts";
import type { RenderContext } from "./components/component.ts";
import { createEventBus, createStateStore, createAnsiRenderer, createInputHandler, QuitCommand, ClearConsoleCommand, ToggleServerCommand } from "./implementations/index.ts";
import { StatsPanel } from "./components/stats-panel.ts";
import { ConsolePanel } from "./components/console-panel.ts";
import { SplitLayout } from "./layout/split-layout.ts";

/**
 * TUI Facade Options
 */
export interface TuiFacadeOptions {
  /** Theme colors */
  theme: Required<ThemeConfig>;
  /** Custom renderer (defaults to AnsiRenderer) */
  renderer?: Renderer;
  /** Custom event bus (defaults to new TuiEventBus) */
  eventBus?: EventBus;
  /** Custom state store (defaults to new TuiStateStore) */
  stateStore?: StateStore;
  /** Custom input handler (defaults to new TuiInputHandler) */
  inputHandler?: InputHandler;
}

/**
 * TUI Facade
 * 
 * Provides a simplified API for the TUI system.
 */
export class TuiFacade {
  readonly eventBus: EventBus;
  readonly stateStore: StateStore;
  readonly renderer: Renderer;
  readonly inputHandler: InputHandler;
  readonly theme: Required<ThemeConfig>;

  private layout: SplitLayout;
  private running = false;
  private renderScheduled = false;
  private uptimeTimer?: number;

  constructor(options: TuiFacadeOptions) {
    this.theme = options.theme;
    this.eventBus = options.eventBus ?? createEventBus();
    this.stateStore = options.stateStore ?? createStateStore();
    this.renderer = options.renderer ?? createAnsiRenderer();
    this.inputHandler = options.inputHandler ?? createInputHandler();

    // Create layout with panels
    const statsPanel = new StatsPanel();
    const consolePanel = new ConsolePanel();
    this.layout = new SplitLayout(statsPanel, consolePanel, 0.3);

    // Set up default key bindings
    this.setupDefaultKeyBindings();

    // Subscribe to state changes for re-rendering
    this.stateStore.subscribe(() => this.scheduleRender());
    this.eventBus.subscribe("ui:resize", () => this.scheduleRender());
  }

  /**
   * Logger transport for receiving logs
   */
  readonly transport: LogTransport = {
    name: "tui",
    log: (entry: LogEntry) => {
      this.addLog(entry);
    },
  };

  /**
   * Start the TUI
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.renderer.init();
    this.inputHandler.start();

    // Update state
    const size = this.renderer.getSize();
    const currentUi = this.stateStore.getState().ui;
    this.stateStore.setState({
      ui: { 
        width: size.width, 
        height: size.height, 
        running: true,
        expandedServers: currentUi.expandedServers,
        logLevelFilter: currentUi.logLevelFilter,
      },
    });

    // Start uptime timer (update every second)
    this.uptimeTimer = setInterval(() => {
      // Only re-render if connected (to update uptime display)
      if (this.stateStore.getState().connection.connected) {
        this.scheduleRender();
      }
    }, 1000);

    this.render();
  }

  /**
   * Stop the TUI
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;
    
    // Clear uptime timer
    if (this.uptimeTimer !== undefined) {
      clearInterval(this.uptimeTimer);
      this.uptimeTimer = undefined;
    }
    
    this.inputHandler.stop();
    this.renderer.cleanup();
  }

  /**
   * Log a message (convenience method)
   */
  log(text: string, level: LogLevel = "info", category: string = "Main"): void {
    this.addLog({
      level,
      message: text,
      category,
      timestamp: new Date(),
      args: [text],
    });
  }

  /**
   * Update connection state
   */
  setConnected(connected: boolean, port: number): void {
    this.stateStore.setState({
      connection: { 
        connected, 
        port,
        connectedAt: connected ? new Date() : undefined,
      },
    });
    this.eventBus.emit({ type: "connection:changed", connected, port });
  }

  /**
   * Update file stats
   */
  updateStats(stats: Partial<TuiState["files"]>): void {
    const current = this.stateStore.getState().files;
    this.stateStore.setState({
      files: { ...current, ...stats },
    });
  }

  /**
   * Update upload statistics
   */
  updateUploadStats(stats: Partial<Pick<TuiState["files"], "successCount" | "errorCount" | "skippedCount">>): void {
    const current = this.stateStore.getState().files;
    this.stateStore.setState({
      files: { ...current, ...stats },
    });
  }

  /**
   * Update queue state
   */
  updateQueue(queue: Partial<TuiState["queue"]>): void {
    const current = this.stateStore.getState().queue;
    this.stateStore.setState({
      queue: { ...current, ...queue },
    });
  }

  /**
   * Clear console logs
   */
  clearConsole(): void {
    this.stateStore.setState({ logs: [] });
  }

  /**
   * Toggle server expansion in file list
   */
  toggleServerExpansion(server: string): void {
    const state = this.stateStore.getState();
    const expanded = state.ui.expandedServers;
    const isExpanded = expanded.includes(server);
    
    const newExpanded = isExpanded
      ? expanded.filter(s => s !== server)
      : [...expanded, server];
    
    this.stateStore.setState({
      ui: { ...state.ui, expandedServers: newExpanded },
    });
  }

  /**
   * Cycle through servers for expansion toggle
   * 
   * Behavior:
   * - If all servers are collapsed: expand the first one (alphabetically)
   * - If some servers are expanded: expand the next collapsed one (in alphabetical order)
   * - If all servers are expanded: collapse all
   */
  cycleServerExpansion(): void {
    const state = this.stateStore.getState();
    // Sort servers alphabetically for consistent ordering (home first, then others)
    const servers = [...new Set(state.files.list.map(f => f.server))].sort();
    
    if (servers.length === 0) return;
    
    const expanded = state.ui.expandedServers;
    const allExpanded = servers.every(s => expanded.includes(s));
    
    if (allExpanded) {
      // All expanded - collapse all
      this.stateStore.setState({
        ui: { ...state.ui, expandedServers: [] },
      });
    } else {
      // Find first collapsed server (in sorted order) and expand it
      const collapsedServer = servers.find(s => !expanded.includes(s));
      if (collapsedServer) {
        this.toggleServerExpansion(collapsedServer);
      }
    }
  }

  /**
   * Cycle through log level filters
   */
  cycleLogLevelFilter(): void {
    const state = this.stateStore.getState();
    const levels: Array<TuiState["ui"]["logLevelFilter"]> = ["all", "error", "warn", "info", "success", "debug"];
    const currentIndex = levels.indexOf(state.ui.logLevelFilter);
    const nextIndex = (currentIndex + 1) % levels.length;
    
    this.stateStore.setState({
      ui: { ...state.ui, logLevelFilter: levels[nextIndex] },
    });
  }

  /**
   * Add a key binding
   */
  bindKey(binding: KeyBinding): void {
    this.inputHandler.bind(binding);
  }

  /**
   * Remove a key binding
   */
  unbindKey(key: string): void {
    this.inputHandler.unbind(key);
  }

  /**
   * Subscribe to events
   */
  on<T extends TuiEvent["type"]>(
    type: T,
    handler: (event: Extract<TuiEvent, { type: T }>) => void
  ): () => void {
    return this.eventBus.subscribe(type, handler as (event: TuiEvent) => void);
  }

  /**
   * Emit an event
   */
  emit(event: TuiEvent): void {
    this.eventBus.emit(event);
  }

  private addLog(entry: LogEntry): void {
    const state = this.stateStore.getState();
    const logs = [...state.logs, entry];

    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }

    this.stateStore.setState({ logs });
    this.eventBus.emit({ type: "log:added", entry });
  }

  private scheduleRender(): void {
    if (this.renderScheduled || !this.running) return;
    this.renderScheduled = true;

    // Use queueMicrotask for batching
    queueMicrotask(() => {
      this.renderScheduled = false;
      if (this.running) {
        this.render();
      }
    });
  }

  private render(): void {
    if (!this.running) return;

    const state = this.stateStore.getState();
    const { width, height } = state.ui;

    // Build stats from state
    const stats: TuiStats = {
      connected: state.connection.connected,
      port: state.connection.port,
      filesUploaded: state.files.uploaded,
      filesWatched: state.files.watched,
      totalRam: state.files.totalRam,
      lastUpload: state.files.lastUpload,
      files: state.files.list,
    };

    // Create render context for components
    const context: RenderContext = {
      width,
      height,
      stats,
      logs: state.logs,
      theme: this.theme,
      state, // Pass full state for advanced components
    };

    const lines = this.layout.render(context);
    this.renderer.render(lines);
  }

  private setupDefaultKeyBindings(): void {
    // Quit on 'q' or Ctrl+C
    const quitCommand = new QuitCommand(() => {
      this.stop();
      Deno.exit(0);
    });

    this.inputHandler.bind({ key: "q", command: quitCommand, description: "Quit" });
    this.inputHandler.bind({ key: "ctrl+c", command: quitCommand, description: "Quit" });

    // Clear console on 'c'
    const clearCommand = new ClearConsoleCommand(() => this.clearConsole());
    this.inputHandler.bind({ key: "c", command: clearCommand, description: "Clear console" });

    // Toggle server expansion on 'e'
    const expandCommand = new ToggleServerCommand(() => this.cycleServerExpansion());
    this.inputHandler.bind({ key: "e", command: expandCommand, description: "Expand/collapse servers" });

    // Cycle log level filter on 'l'
    const logLevelCommand = new ToggleServerCommand(() => this.cycleLogLevelFilter());
    this.inputHandler.bind({ key: "l", command: logLevelCommand, description: "Cycle log level filter" });
  }
}

/**
 * Create a TUI facade
 */
export function createTui(options: TuiFacadeOptions): TuiFacade {
  return new TuiFacade(options);
}
