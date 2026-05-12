/**
 * Plugin config registry
 * 
 * Allows plugins to register their own configuration options.
 */

import type { ValidationResult } from "../validation.ts";

/**
 * Plugin config schema types
 */
export type ConfigSchemaType = 
  | "string" 
  | "number" 
  | "boolean" 
  | "object" 
  | "array";

/**
 * Plugin config schema definition
 */
export interface ConfigSchema {
  type: ConfigSchemaType;
  description?: string;
  default?: unknown;
  required?: boolean;
  enum?: unknown[];
  properties?: Record<string, ConfigSchema>;
  items?: ConfigSchema;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

/**
 * Plugin config definition
 */
export interface PluginConfigDefinition {
  /** Plugin name */
  name: string;
  /** Config key path (e.g., "css.autoInject") */
  key: string;
  /** Schema for the config value */
  schema: ConfigSchema;
  /** Default value */
  default: unknown;
  /** How to merge values */
  mergeStrategy: "replace" | "deep" | "array";
}

/**
 * Plugin config registry
 */
export class PluginConfigRegistry {
  private definitions: Map<string, PluginConfigDefinition> = new Map();
  private values: Map<string, unknown> = new Map();
  
  /**
   * Register a plugin config definition
   */
  register(definition: PluginConfigDefinition): void {
    const fullKey = `${definition.name}.${definition.key}`;
    this.definitions.set(fullKey, definition);
    
    // Set default value
    if (definition.default !== undefined) {
      this.values.set(fullKey, definition.default);
    }
  }
  
  /**
   * Get a config value
   */
  get<T>(pluginName: string, key: string): T | undefined {
    const fullKey = `${pluginName}.${key}`;
    return this.values.get(fullKey) as T | undefined;
  }
  
  /**
   * Get a config value with default
   */
  getWithDefault<T>(pluginName: string, key: string, defaultValue: T): T {
    const fullKey = `${pluginName}.${key}`;
    const value = this.values.get(fullKey);
    return value !== undefined ? (value as T) : defaultValue;
  }
  
  /**
   * Set a config value
   */
  set(pluginName: string, key: string, value: unknown): void {
    const fullKey = `${pluginName}.${key}`;
    const definition = this.definitions.get(fullKey);
    
    if (definition) {
      // Validate against schema
      const result = this.validateValue(value, definition.schema);
      if (!result.success) {
        throw new Error(
          `Invalid config value for ${fullKey}: ${result.errors.map((e) => e.message).join(", ")}`,
        );
      }
    }
    
    this.values.set(fullKey, value);
  }
  
  /**
   * Check if a config key exists
   */
  has(pluginName: string, key: string): boolean {
    const fullKey = `${pluginName}.${key}`;
    return this.values.has(fullKey);
  }
  
  /**
   * Get all definitions for a plugin
   */
  getPluginDefinitions(pluginName: string): PluginConfigDefinition[] {
    const result: PluginConfigDefinition[] = [];
    for (const [key, def] of this.definitions) {
      if (key.startsWith(`${pluginName}.`)) {
        result.push(def);
      }
    }
    return result;
  }
  
  /**
   * Get all registered definitions
   */
  getAllDefinitions(): PluginConfigDefinition[] {
    return Array.from(this.definitions.values());
  }
  
  /**
   * Load config from user-provided plugin config
   */
  loadPluginConfig(pluginName: string, config: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(config)) {
      this.set(pluginName, key, value);
    }
  }
  
  /**
   * Validate a value against a schema
   */
  private validateValue(
    value: unknown,
    schema: ConfigSchema,
  ): ValidationResult<unknown> {
    const errors: Array<{ path: string; message: string; value: unknown }> = [];
    
    // Type check
    const actualType = this.getValueType(value);
    if (actualType !== schema.type) {
      errors.push({
        path: "",
        message: `Expected type ${schema.type}, got ${actualType}`,
        value,
      });
    }
    
    // Enum check
    if (schema.enum !== undefined && !schema.enum.includes(value)) {
      errors.push({
        path: "",
        message: `Value must be one of: ${schema.enum.join(", ")}`,
        value,
      });
    }
    
    // Number constraints
    if (schema.type === "number" && typeof value === "number") {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({
          path: "",
          message: `Value must be >= ${schema.minimum}`,
          value,
        });
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({
          path: "",
          message: `Value must be <= ${schema.maximum}`,
          value,
        });
      }
    }
    
    // String constraints
    if (schema.type === "string" && typeof value === "string") {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({
          path: "",
          message: `String length must be >= ${schema.minLength}`,
          value,
        });
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({
          path: "",
          message: `String length must be <= ${schema.maxLength}`,
          value,
        });
      }
    }
    
    return errors.length === 0
      ? { success: true, data: value, errors: [] }
      : { success: false, errors };
  }
  
  /**
   * Get the type of a value
   */
  private getValueType(value: unknown): ConfigSchemaType {
    if (value === null) return "object";
    if (Array.isArray(value)) return "array";
    if (typeof value === "object") return "object";
    if (typeof value === "string") return "string";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    return "string"; // fallback
  }
}

/**
 * Global plugin config registry instance
 */
export const pluginConfigRegistry = new PluginConfigRegistry();

/**
 * Helper function to define a plugin config
 */
export function definePluginConfig(
  definition: PluginConfigDefinition,
): PluginConfigDefinition {
  pluginConfigRegistry.register(definition);
  return definition;
}
