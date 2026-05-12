/**
 * TUI Module
 * 
 * Terminal User Interface for denoburner dev mode.
 */

// Facade
export { TuiFacade, createTui, type TuiFacadeOptions } from "./tui-facade.ts";

// Interfaces
export type {
  TuiEvent,
  TuiStats,
  EventSubscriber,
  EventBus,
  TuiState,
  StateSubscriber,
  StateStore,
  ColorName,
  TextStyle,
  Renderer,
  RenderContext,
  ComponentLifecycle,
  TuiComponent,
  Layout,
  LayoutSlotOptions,
  LayoutDirection,
  LayoutOptions,
  Command,
  KeyBinding,
  InputHandler,
} from "./interfaces/index.ts";

// Implementations
export {
  TuiEventBus,
  createEventBus,
  TuiStateStore,
  createStateStore,
  initialTuiState,
  AnsiRenderer,
  createAnsiRenderer,
  TuiInputHandler,
  createInputHandler,
  QuitCommand,
  ClearConsoleCommand,
} from "./implementations/index.ts";

// Components
export { StatsPanel } from "./components/stats-panel.ts";
export { ConsolePanel } from "./components/console-panel.ts";
export { SplitLayout } from "./layout/split-layout.ts";

// Utilities
export { colors, colorize } from "./colors.ts";
