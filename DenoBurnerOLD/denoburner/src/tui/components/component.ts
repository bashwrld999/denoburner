/**
 * TUI Component Interface
 * 
 * Base interface for all TUI components.
 * Components are responsible for rendering their own content.
 */

import type { RenderContext as NewRenderContext, TuiComponent as NewTuiComponent, Layout } from "../interfaces/index.ts";
import type { TuiStats } from "../interfaces/event-bus.ts";
import type { LogEntry } from "../../logger/interfaces/index.ts";
import type { TuiState } from "../interfaces/state-store.ts";

/**
 * Render context passed to components
 */
export interface RenderContext {
  /** Available width for content */
  width: number;
  /** Available height for content */
  height: number;
  /** Current terminal stats */
  stats: TuiStats;
  /** Log entries */
  logs: LogEntry[];
  /** Theme colors */
  theme: Record<string, string>;
  /** Full TUI state (for advanced components) */
  state?: TuiState;
}

/**
 * Base component interface
 */
export interface TuiComponent {
  /** Unique component name for debugging */
  readonly name: string;
  
  /**
   * Render the component to an array of lines
   * @param context - Render context with dimensions and data
   * @returns Array of strings, one per line
   */
  render(context: RenderContext): string[];
}

/**
 * Layout component that contains other components
 */
export interface TuiLayout extends TuiComponent {
  /** Add a child component */
  add(component: TuiComponent): void;
  /** Remove a child component */
  remove(component: TuiComponent): void;
  /** Get all child components */
  getChildren(): TuiComponent[];
}
