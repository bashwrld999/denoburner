/**
 * Component Interface
 * 
 * Enhanced component interface with lifecycle hooks.
 */

import type { TuiEvent } from "./event-bus.ts";
import type { RenderContext } from "./renderer.ts";

/**
 * Component lifecycle hooks
 */
export interface ComponentLifecycle {
  /**
   * Called when component is mounted
   */
  onMount?(): void | Promise<void>;

  /**
   * Called when component props/state update
   */
  onUpdate?(): void | Promise<void>;

  /**
   * Called when component is unmounted
   */
  onUnmount?(): void | Promise<void>;
}

/**
 * TUI Component Interface
 * 
 * Base interface for all TUI components.
 */
export interface TuiComponent extends ComponentLifecycle {
  /** Component name for debugging */
  readonly name: string;

  /** Unique component ID */
  readonly id: string;

  /**
   * Render the component
   * @param context - Render context with size, theme, renderer
   * @returns Array of lines to render
   */
  render(context: RenderContext): string[];

  /**
   * Optional: Events this component subscribes to
   */
  getSubscribedEvents?(): string[];

  /**
   * Optional: Handle events directly
   */
  handleEvent?(event: TuiEvent): void;
}

/**
 * Layout interface for components that contain other components
 */
export interface Layout extends TuiComponent {
  /**
   * Add a child component
   */
  addComponent(component: TuiComponent, options?: LayoutSlotOptions): void;

  /**
   * Remove a child component by ID
   */
  removeComponent(id: string): void;

  /**
   * Get a child component by ID
   */
  getComponent(id: string): TuiComponent | undefined;

  /**
   * Get all child components
   */
  getChildren(): TuiComponent[];
}

/**
 * Options for a component slot in a layout
 */
export interface LayoutSlotOptions {
  /** Flex grow factor */
  grow?: number;

  /** Fixed size (overrides grow) */
  size?: number;

  /** Minimum size */
  minSize?: number;

  /** Maximum size */
  maxSize?: number;

  /** Alignment */
  align?: "start" | "center" | "end" | "stretch";
}

/**
 * Layout direction
 */
export type LayoutDirection = "horizontal" | "vertical";

/**
 * Layout options
 */
export interface LayoutOptions {
  /** Direction of layout */
  direction: LayoutDirection;

  /** Gap between children */
  gap?: number;

  /** Padding around children */
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
}
