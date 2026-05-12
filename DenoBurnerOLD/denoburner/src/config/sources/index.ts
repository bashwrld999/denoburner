/**
 * Config sources module
 * 
 * Implements Chain of Responsibility pattern for loading config from multiple sources.
 * Priority: CLI args > Environment variables > Config file > Base configs > Defaults
 */

import type { DenoBurnerUserConfig } from "../types.ts";
import { EnvSource } from "./env-source.ts";
import { CliSource } from "./cli-source.ts";

/**
 * Config source interface
 */
export interface ConfigSource {
  /** Source name for debugging */
  name: string;
  /** Priority (higher = more important) */
  priority: number;
  /** Load config from this source */
  load(): Promise<DenoBurnerUserConfig>;
  /** Check if this source is available */
  isAvailable?(): boolean | Promise<boolean>;
}

/**
 * Source chain manager
 * 
 * Manages multiple config sources and merges them by priority.
 */
export class SourceChain {
  private sources: ConfigSource[] = [];
  
  constructor() {
    // Register default sources with priority
    this.register(new EnvSource(), 50);
    this.register(new CliSource(), 100);
  }
  
  /**
   * Register a config source
   */
  register(source: ConfigSource, priority?: number): void {
    if (priority !== undefined) {
      (source as { priority: number }).priority = priority;
    }
    this.sources.push(source);
  }
  
  /**
   * Load and merge config from all sources
   */
  async load(): Promise<{
    config: DenoBurnerUserConfig;
    sources: Map<string, DenoBurnerUserConfig>;
  }> {
    // Sort by priority (ascending, so higher priority overwrites lower)
    const sorted = [...this.sources].sort((a, b) => a.priority - b.priority);
    
    const merged: DenoBurnerUserConfig = {};
    const sourceMap = new Map<string, DenoBurnerUserConfig>();
    
    for (const source of sorted) {
      try {
        // Check if source is available
        if (source.isAvailable && !await source.isAvailable()) {
          continue;
        }
        
        const config = await source.load();
        sourceMap.set(source.name, config);
        
        // Deep merge
        deepMerge(merged as unknown as Record<string, unknown>, config as unknown as Record<string, unknown>);
      } catch (error) {
        console.warn(`Failed to load config from ${source.name}:`, error);
      }
    }
    
    return { config: merged, sources: sourceMap };
  }
  
  /**
   * Get all registered sources
   */
  getSources(): ConfigSource[] {
    return [...this.sources];
  }
}

/**
 * Deep merge two objects (mutates target)
 */
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];
    
    // Both are plain objects - merge recursively
    if (
      isPlainObject(targetValue) && 
      isPlainObject(sourceValue)
    ) {
      target[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      );
    }
    // Both are arrays - concatenate or replace
    else if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      // For arrays, we replace (not concatenate) to allow overriding
      target[key] = sourceValue;
    }
    // Otherwise, replace with source value
    else {
      target[key] = sourceValue;
    }
  }
  
  return target;
}

/**
 * Check if value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && 
    value !== null && 
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

// Re-export individual sources
export { EnvSource } from "./env-source.ts";
export { CliSource } from "./cli-source.ts";
