/**
 * Event Mediator
 * 
 * Decouples components by using a central event bus for communication.
 * Components emit events and subscribe to events without knowing about each other.
 * 
 * ## Responsibilities
 * 
 * 1. **Plugin Management**: Manages event flow plugins
 *    - ConnectionEventPlugin: Connection events and initial uploads
 *    - FileEventPlugin: File change events and HMR
 *    - UploadEventPlugin: Upload result events
 *    - QueueEventPlugin: Queue processing events
 * 
 * 2. **Infrastructure Setup**: Initializes shared infrastructure
 *    - Location cache for file location resolution
 *    - Dependency graph for cascading updates
 *    - HMR batcher for grouped file changes
 *    - Change analyzer for detailed metadata
 * 
 * 3. **Lifecycle Management**: Manages subscriptions and cleanup
 *    - Tracks all plugin subscriptions
 *    - Provides dispose() for clean shutdown
 * 
 * ## Architecture
 * 
 * The EventMediator follows the Mediator Pattern to prevent direct coupling
 * between components. It delegates to plugins for specific event domains.
 * 
 * @see IEventFlowPlugin for the plugin interface
 * @see IPluginManager for the plugin manager interface
 * @see IEventBus for the event bus interface
 */

import type { IEventBus } from "./event-bus.ts";
import type { DenoburnerEventMap } from "./events.ts";
import type { RemoteApiServer } from "../remote-api/index.ts";
import type { UploaderOrchestrator } from "../uploader/index.ts";
import type { WatcherImpl, LocationCache, DependencyGraph, HmrBatcher, ChangeAnalyzer } from "../watcher/index.ts";
import type { TuiFacade } from "../tui/index.ts";
import type { DenoburnerStateStore, FileCache, UploadQueueManager } from "../state/index.ts";
import type { ResolvedDenoBurnerConfig } from "../config/types.ts";
import type { Logger } from "../logger/interfaces/index.ts";
import type { IEventFlowPlugin, IPluginManager, PluginContext } from "./plugins/index.ts";
import { PluginManager, createBuiltinPlugins, type BuiltinPluginDeps } from "./plugins/index.ts";
import { DependencyAnalyzer } from "../analyzer/index.ts";
import { createLocationCache, createDependencyGraph, createHmrBatcher, createChangeAnalyzer } from "../watcher/index.ts";

/**
 * Components needed by the EventMediator
 */
export interface EventMediatorComponents {
  server: RemoteApiServer;
  uploader: UploaderOrchestrator;
  watcher: WatcherImpl;
  tui: TuiFacade;
  stateStore: DenoburnerStateStore;
  fileCache: FileCache;
  uploadQueue: UploadQueueManager;
  /** Location cache for pre-resolved file locations */
  locationCache?: LocationCache;
  /** Dependency graph for cascading updates */
  dependencyGraph?: DependencyGraph;
  /** HMR batcher for grouping file changes */
  hmrBatcher?: HmrBatcher;
  /** Change analyzer for detailed change metadata */
  changeAnalyzer?: ChangeAnalyzer;
}

/**
 * Event Mediator
 * 
 * Central coordinator that wires up event flows between components.
 * Delegates to plugins for specific event domains.
 */
export class EventMediator {
  private pluginManager: IPluginManager;
  private dependencyAnalyzer?: DependencyAnalyzer;
  private locationCache: LocationCache;
  private dependencyGraph?: DependencyGraph;
  private hmrBatcher?: HmrBatcher;
  private changeAnalyzer?: ChangeAnalyzer;
  private pluginContext?: PluginContext;
  
  constructor(
    private eventBus: IEventBus<DenoburnerEventMap>,
    private components: EventMediatorComponents,
    private config: ResolvedDenoBurnerConfig,
    private log: Logger,
  ) {
    // Initialize infrastructure
    this.locationCache = components.locationCache ?? createLocationCache();
    
    // Initialize dependency analyzer and graph if cascading updates are enabled
    if (config.hmr.cascadingUpdates) {
      this.dependencyAnalyzer = new DependencyAnalyzer({
        rootDir: config.rootDir,
        serversDir: config.serversDir,
      });
      this.dependencyGraph = components.dependencyGraph ?? createDependencyGraph(
        { maxDepth: config.hmr.maxCascadeDepth },
        log.child("DepGraph")
      );
    }
    
    // Initialize HMR batcher if batching is enabled
    if (config.hmr.batching) {
      this.hmrBatcher = components.hmrBatcher ?? createHmrBatcher(
        {
          batchDelay: config.hmr.batchDelay,
          maxBatchSize: config.hmr.maxBatchSize,
          computeAffected: config.hmr.cascadingUpdates,
        },
        log.child("Batcher")
      );
      
      // Set dependency graph for computing affected files
      if (this.dependencyGraph) {
        this.hmrBatcher.setDependencyGraph(this.dependencyGraph);
      }
    }
    
    // Initialize change analyzer if tracking is enabled
    if (config.hmr.trackChanges) {
      this.changeAnalyzer = components.changeAnalyzer ?? createChangeAnalyzer({}, log.child("Changes"));
    }
    
    // Create plugin manager and initialize plugins
    this.pluginManager = new PluginManager();
    this.initializePlugins();
  }

  /**
   * Initialize all plugins
   */
  private async initializePlugins(): Promise<void> {
    // Create doInitialUpload callback
    const doInitialUpload = async () => {
      const { createInitialUploadOrchestrator } = await import("../uploader/index.ts");
      const orchestrator = createInitialUploadOrchestrator({
        watcher: this.components.watcher,
        uploader: this.components.uploader,
        stateStore: this.components.stateStore,
        fileCache: this.components.fileCache,
        tui: this.components.tui,
        config: this.config,
        log: this.log.child("Upload"),
        dependencyAnalyzer: this.dependencyAnalyzer,
        dependencyGraph: this.dependencyGraph,
      });
      await orchestrator.execute();
    };

    // Create plugin context
    const registeredHandlers: Set<string> = new Set();
    
    this.pluginContext = {
      eventBus: this.eventBus,
      log: this.log,
      registerHandler: (handler) => {
        registeredHandlers.add(handler.name);
      },
      subscribe: <K extends keyof DenoburnerEventMap>(
        event: K,
        handler: (payload: DenoburnerEventMap[K]) => void | Promise<void>,
      ) => {
        return this.eventBus.on(event, handler);
      },
    };

    // Create and register builtin plugins
    const builtinDeps: BuiltinPluginDeps = {
      server: this.components.server,
      uploader: this.components.uploader,
      watcher: this.components.watcher,
      tui: this.components.tui,
      stateStore: this.components.stateStore,
      fileCache: this.components.fileCache,
      uploadQueue: this.components.uploadQueue,
      config: this.config,
      dependencyAnalyzer: this.dependencyAnalyzer,
      dependencyGraph: this.dependencyGraph,
      hmrBatcher: this.hmrBatcher,
      doInitialUpload,
    };

    const builtinPlugins = createBuiltinPlugins(builtinDeps);
    for (const plugin of builtinPlugins) {
      this.pluginManager.register(plugin);
    }

    // Initialize all plugins
    await this.pluginManager.initializeAll(this.pluginContext);
  }
  
  /**
   * Get the plugin manager (for testing/debugging)
   */
  getPluginManager(): IPluginManager {
    return this.pluginManager;
  }
  
  /**
   * Clean up all event subscriptions
   */
  async dispose(): Promise<void> {
    // Dispose all plugins
    await this.pluginManager.disposeAll();
    
    // Flush any pending batches
    if (this.hmrBatcher) {
      this.hmrBatcher.flush();
    }
  }
}

/**
 * Create an event mediator
 */
export function createEventMediator(
  eventBus: IEventBus<DenoburnerEventMap>,
  components: EventMediatorComponents,
  config: ResolvedDenoBurnerConfig,
  log: Logger,
): EventMediator {
  return new EventMediator(eventBus, components, config, log);
}
