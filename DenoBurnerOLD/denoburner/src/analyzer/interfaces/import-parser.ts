/**
 * Import Parser Interface
 * 
 * Strategy pattern for parsing imports from file content.
 */

import type { ParsedImport } from "../types.ts";

/**
 * Import Parser Interface
 * 
 * Defines the contract for parsing imports from source code.
 * Different implementations can use regex, AST parsing, etc.
 */
export interface ImportParser {
  /**
   * Parser name for identification
   */
  readonly name: string;

  /**
   * Parse imports from file content
   * @param content - The source code content
   * @returns Array of parsed imports
   */
  parse(content: string): ParsedImport[];
}
