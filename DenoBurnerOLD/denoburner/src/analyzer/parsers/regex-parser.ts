/**
 * Regex Import Parser
 * 
 * Parses imports using regular expressions.
 * Fast but may miss some edge cases.
 */

import type { ImportParser } from "../interfaces/import-parser.ts";
import type { ParsedImport } from "../types.ts";

/**
 * Regular expressions for parsing imports
 */
const IMPORT_PATTERNS = {
  // Static imports: import ... from 'specifier'
  static: /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s*['"]([^'"]+)['"]/g,
  // Dynamic imports: import('specifier')
  dynamic: /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // Export from: export ... from 'specifier'
  exportFrom: /export\s+(?:type\s+)?(?:\{[^}]*\}|\*)\s*from\s*['"]([^'"]+)['"]/g,
} as const;

/**
 * Regex Import Parser
 * 
 * Parses imports from source code using regular expressions.
 * This is the default parser - fast but may miss some edge cases.
 */
export class RegexImportParser implements ImportParser {
  readonly name = "regex";

  /**
   * Parse all imports from file content
   */
  parse(content: string): ParsedImport[] {
    const imports: ParsedImport[] = [];
    const lines = content.split("\n");

    // Process each line to get accurate line numbers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check static imports
      this.parsePattern(line, IMPORT_PATTERNS.static, "static", lineNum, imports);
      
      // Check dynamic imports
      this.parsePattern(line, IMPORT_PATTERNS.dynamic, "dynamic", lineNum, imports);
      
      // Check export from
      this.parsePattern(line, IMPORT_PATTERNS.exportFrom, "export-from", lineNum, imports);
    }

    // Remove duplicates
    return this.deduplicate(imports);
  }

  /**
   * Parse a specific pattern from a line
   */
  private parsePattern(
    line: string,
    pattern: RegExp,
    type: ParsedImport["type"],
    lineNum: number,
    imports: ParsedImport[],
  ): void {
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    
    let match;
    while ((match = pattern.exec(line)) !== null) {
      imports.push({
        specifier: match[1],
        line: lineNum,
        type,
      });
    }
  }

  /**
   * Remove duplicate imports
   */
  private deduplicate(imports: ParsedImport[]): ParsedImport[] {
    const seen = new Set<string>();
    return imports.filter(({ specifier }) => {
      if (seen.has(specifier)) return false;
      seen.add(specifier);
      return true;
    });
  }
}
