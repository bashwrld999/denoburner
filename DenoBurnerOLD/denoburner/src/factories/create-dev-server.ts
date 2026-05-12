import { ServiceContainer, ServiceToken } from "../core/service-container.ts";
import { createRemoteApiServer, RemoteApiServer } from "../remote-api/index.ts";
import { UploaderOrchestrator, createUploader } from "../uploader/index.ts";
import { createWatcher, WatcherImpl } from "../watcher/index.ts";
import { TuiFacade, createTui } from "../tui/index.ts";
import { Bundler, createBundler as createBundlerInstance } from "../bundler/index.ts";
import { PluginManager } from "../bundler/plugin-manager.ts";
import { 
  DenoBurnerLogger, 
  setLogger,
  type Logger,
} from "../logger/index.ts";
import {
  DenoburnerStateStore,
  createStateStore,
  FileCache,
  createFileCache,
  UploadQueueManager,
  createUploadQueue,
  type DenoburnerState,
} from "../state/index.ts";
import {
  TypedEventBus,
  EventMediator,
  createEventBus,
  createEventMediator,
  type DenoburnerEventMap,
  type EventMediatorComponents,
} from "../core/index.ts";
import type { ResolvedDenoBurnerConfig } from "../config/types.ts";

/**
 * Service tokens for dependency injection
 */
export const Tokens = {
  Config: new ServiceToken<ResolvedDenoBurnerConfig>("Config"),
  StateStore: new ServiceToken<DenoburnerStateStore>("StateStore"),
  Server: new ServiceToken<RemoteApiServer>("Server"),
  Uploader: new ServiceToken<UploaderOrchestrator>("Uploader"),
  Watcher: new ServiceToken<WatcherImpl>("Watcher"),
  Tui: new ServiceToken<TuiFacade>("Tui"),
  Bundler: new ServiceToken<Bundler>("Bundler"),
  PluginManager: new ServiceToken<PluginManager>("PluginManager"),
  FileCache: new ServiceToken<FileCache>("FileCache"),
  UploadQueue: new ServiceToken<UploadQueueManager>("UploadQueue"),
  Logger: new ServiceToken<Logger>("Logger"),
  EventBus: new ServiceToken<TypedEventBus<DenoburnerEventMap>>("EventBus"),
  EventMediator: new ServiceToken<EventMediator>("EventMediator"),
} as const;

/**
 * Create a fully configured dev server with dependency injection
 */
export function createDevServer(config: ResolvedDenoBurnerConfig): {
  container: ServiceContainer;
  stateStore: DenoburnerStateStore;
  start: () => Promise<void>;
  stop: () => void;
} {
  const container = new ServiceContainer();

  // Register config
  container.registerInstance(Tokens.Config, config);

  // Register unified state store
  container.registerSingleton(Tokens.StateStore, () => createStateStore());

  // Register file cache
  container.registerSingleton(Tokens.FileCache, () => createFileCache());

  // Register TUI first (needed for logger transport)
  container.registerSingleton(Tokens.Tui, () => 
    createTui({ theme: config.theme })
  );

  // Register logger with TUI transport
  container.registerSingleton(Tokens.Logger, (c) => {
    const tui = c.get(Tokens.Tui);
    const logger = new DenoBurnerLogger({ 
      defaultCategory: 'App',
      minLevel: config.logLevel,
    });
    logger.addTransport(tui.transport);
    
    return logger;
  });

  // Register event bus
  container.registerSingleton(Tokens.EventBus, () => createEventBus<DenoburnerEventMap>());

  // Register upload queue with logger injection
  container.registerSingleton(Tokens.UploadQueue, (c) => 
    createUploadQueue(
      c.get(Tokens.StateStore),
      c.get(Tokens.Logger).child("Queue"),
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
      }
    )
  );

  // Register server using factory
  container.registerSingleton(Tokens.Server, () => 
    createRemoteApiServer(config.port, config.timeout)
  );

  // Register watcher using factory
  container.registerSingleton(Tokens.Watcher, () => 
    createWatcher({
      patterns: config.watch,
      debounceDelay: 50,
    })
  );

  // Register plugin manager and bundler using factory pattern
  container.registerSingleton(Tokens.Bundler, () => 
    createBundlerInstance({
      sourceMap: config.sourceMap,
      minify: config.minify,
    })
  );

  // Register plugin manager for external access
  container.registerSingleton(Tokens.PluginManager, (c) => 
    c.get(Tokens.Bundler).plugins
  );

  // Register uploader using factory
  container.registerSingleton(Tokens.Uploader, (c) => 
    createUploader(c.get(Tokens.Server), c.get(Tokens.Bundler), c.get(Tokens.Config), c.get(Tokens.Logger).child("Upload"))
  );

  // Register event mediator
  container.registerSingleton(Tokens.EventMediator, (c) => {
    const components: EventMediatorComponents = {
      server: c.get(Tokens.Server),
      uploader: c.get(Tokens.Uploader),
      watcher: c.get(Tokens.Watcher),
      tui: c.get(Tokens.Tui),
      stateStore: c.get(Tokens.StateStore),
      fileCache: c.get(Tokens.FileCache),
      uploadQueue: c.get(Tokens.UploadQueue),
    };
    
    return createEventMediator(
      c.get(Tokens.EventBus),
      components,
      config,
      c.get(Tokens.Logger),
    );
  });

  // Initialize logger (triggers registration and global setLogger)
  container.get(Tokens.Logger);

  // Initialize event mediator (wires up all events)
  container.get(Tokens.EventMediator);

  return {
    container,
    stateStore: container.get(Tokens.StateStore),
    start: async () => {
      const server = container.get(Tokens.Server);
      const watcher = container.get(Tokens.Watcher);
      const tui = container.get(Tokens.Tui);
      const stateStore = container.get(Tokens.StateStore);
      const uploadQueue = container.get(Tokens.UploadQueue);
      const log = container.get(Tokens.Logger);
      const mainLog = log.child("Main");
      const serverLog = log.child("Server");
      const watcherLog = log.child("Watcher");

      // Mark UI as running
      stateStore.dispatch({ type: "ui/running", value: true });
      
      tui.start();
      mainLog.info("Starting dev server...");
      serverLog.info(`Starting WebSocket server on port ${config.port}...`);
      
      await server.start();
      
      watcherLog.info("Watching for changes...");
      await watcher.start();
      
      // Start upload queue processing
      uploadQueue.start();
    },
    stop: async () => {
      const server = container.get(Tokens.Server);
      const watcher = container.get(Tokens.Watcher);
      const tui = container.get(Tokens.Tui);
      const stateStore = container.get(Tokens.StateStore);
      const uploadQueue = container.get(Tokens.UploadQueue);
      const eventMediator = container.get(Tokens.EventMediator);
      const mainLog = container.get(Tokens.Logger).child("Main");

      mainLog.info("Shutting down...");
      
      // Stop queue processing
      uploadQueue.stop();
      
      // Dispose event mediator (clean up subscriptions)
      await eventMediator.dispose();
      
      server.stop();
      watcher.stop();
      tui.stop();
      
      stateStore.dispatch({ type: "ui/running", value: false });
    },
  };
}

// Re-export AppState for backward compatibility
export type AppState = DenoburnerState;
