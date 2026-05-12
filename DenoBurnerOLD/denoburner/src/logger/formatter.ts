/**
 * Argument Formatter
 * 
 * Formats arguments into a string like console.log does.
 * Supports strings, numbers, objects, errors, arrays, etc.
 */

import type { ArgumentFormatter } from './interfaces/index.ts';

/**
 * Default Argument Formatter
 * 
 * Formats arguments like console.log does:
 * - Strings are passed through
 * - Numbers/booleans are stringified
 * - Objects are pretty-printed
 * - Errors show name, message, and stack
 * - Arrays show their contents
 */
export class DefaultFormatter implements ArgumentFormatter {
  /**
   * Format arguments into a single string
   * @param args - The arguments to format
   */
  format(args: unknown[]): string {
    return args.map(arg => this.formatArg(arg)).join(' ');
  }

  /**
   * Format a single argument
   */
  private formatArg(arg: unknown, indent = 0): string {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    if (arg instanceof Error) {
      return this.formatError(arg);
    }
    if (arg instanceof Date) {
      return arg.toISOString();
    }
    if (Array.isArray(arg)) {
      return this.formatArray(arg, indent);
    }
    if (typeof arg === 'object') {
      return this.formatObject(arg as Record<string, unknown>, indent);
    }
    return String(arg);
  }

  /**
   * Format an Error object
   */
  private formatError(err: Error): string {
    const lines = [`${err.name}: ${err.message}`];
    if (err.stack) {
      // Only show the first few stack lines
      const stackLines = err.stack.split('\n').slice(1, 4);
      lines.push(...stackLines.map(l => l.trim()));
    }
    return lines.join('\n');
  }

  /**
   * Format an object
   */
  private formatObject(obj: Record<string, unknown>, indent = 0): string {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';
    
    const spaces = '  '.repeat(indent);
    const innerSpaces = '  '.repeat(indent + 1);
    
    const lines = entries.map(([key, value]) => {
      let formatted: string;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        formatted = this.formatObject(value as Record<string, unknown>, indent + 1);
      } else if (Array.isArray(value)) {
        formatted = this.formatArray(value, indent + 1);
      } else {
        formatted = this.formatArg(value, indent + 1);
      }
      return `${innerSpaces}${key}: ${formatted}`;
    });
    
    if (indent === 0) {
      return `{\n${lines.join(',\n')}\n${spaces}}`;
    }
    return `{\n${lines.join(',\n')}\n${spaces}}`;
  }

  /**
   * Format an array
   */
  private formatArray(arr: unknown[], indent = 0): string {
    if (arr.length === 0) return '[]';
    if (arr.length <= 5 && arr.every(item => 
      typeof item !== 'object' || item === null
    )) {
      // Simple array - single line
      const items = arr.map(item => this.formatArg(item, indent));
      return `[${items.join(', ')}]`;
    }
    
    // Complex array - multi-line
    const spaces = '  '.repeat(indent);
    const innerSpaces = '  '.repeat(indent + 1);
    
    const lines = arr.map(item => {
      const formatted = this.formatArg(item, indent + 1);
      return `${innerSpaces}${formatted}`;
    });
    
    return `[\n${lines.join(',\n')}\n${spaces}]`;
  }
}

/**
 * Compact Argument Formatter
 * 
 * Formats arguments in a more compact way for limited display space.
 */
export class CompactFormatter implements ArgumentFormatter {
  private defaultFormatter = new DefaultFormatter();
  
  format(args: unknown[]): string {
    return args.map(arg => this.formatArg(arg)).join(' ');
  }
  
  private formatArg(arg: unknown): string {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}`;
    }
    if (arg instanceof Date) {
      return arg.toISOString();
    }
    if (Array.isArray(arg)) {
      return this.formatArray(arg);
    }
    if (typeof arg === 'object') {
      return this.formatObject(arg as Record<string, unknown>);
    }
    return String(arg);
  }
  
  private formatObject(obj: Record<string, unknown>): string {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';
    if (entries.length <= 3) {
      const items = entries.map(([k, v]) => `${k}: ${this.formatArg(v)}`);
      return `{ ${items.join(', ')} }`;
    }
    return `{ ${entries.length} keys }`;
  }
  
  private formatArray(arr: unknown[]): string {
    if (arr.length === 0) return '[]';
    if (arr.length <= 3) {
      const items = arr.map(item => this.formatArg(item));
      return `[${items.join(', ')}]`;
    }
    return `[${arr.length} items]`;
  }
}

/**
 * Create a default formatter
 */
export function createFormatter(compact = false): ArgumentFormatter {
  return compact ? new CompactFormatter() : new DefaultFormatter();
}
