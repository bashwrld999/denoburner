/**
 * Change Metadata
 * 
 * Provides detailed information about what changed in a file.
 * Used for smarter re-upload decisions and better logging/debugging.
 */

import type { Logger, CategoryLogger } from "../logger/interfaces/index.ts";

/**
 * Content hash information
 */
export interface ContentHash {
  /** Hash of the old content (null if new file) */
  old: string | null;
  /** Hash of the new content */
  new: string;
}

/**
 * Import changes
 */
export interface ImportChanges {
  /** Whether imports changed */
  changed: boolean;
  /** Added imports */
  added: string[];
  /** Removed imports */
  removed: string[];
  /** Unchanged imports */
  unchanged: string[];
}

/**
 * Change metadata for a file
 */
export interface ChangeMetadata {
  /** Whether content changed */
  contentChanged: boolean;
  /** Content hashes */
  contentHash: ContentHash;
  /** Import changes */
  imports: ImportChanges;
  /** Size delta in bytes */
  sizeDelta: number;
  /** Old size (0 if new file) */
  oldSize: number;
  /** New size */
  newSize: number;
  /** Timestamp of change */
  timestamp: number;
  /** Whether this is a new file */
  isNew: boolean;
  /** Whether this is a deletion */
  isDeletion: boolean;
}

/**
 * Options for change analyzer
 */
export interface ChangeAnalyzerOptions {
  /** Whether to track imports (default: true) */
  trackImports?: boolean;
}

/**
 * Change Analyzer
 * 
 * Analyzes file changes to provide detailed metadata.
 */
export class ChangeAnalyzer {
  private trackImports: boolean;
  private log?: Logger | CategoryLogger;

  constructor(options: ChangeAnalyzerOptions = {}, log?: Logger | CategoryLogger) {
    this.trackImports = options.trackImports ?? true;
    this.log = log;
  }

  /**
   * Set logger for debugging
   */
  setLogger(log: Logger | CategoryLogger): void {
    this.log = log;
  }

  /**
   * Analyze changes between old and new content
   * 
   * @param oldContent Previous content (null if new file)
   * @param newContent New content (null if deleted)
   * @param oldImports Previous imports (optional, for comparison)
   * @param newImports New imports (optional, for comparison)
   * @returns Change metadata
   */
  analyze(
    oldContent: string | null,
    newContent: string | null,
    oldImports?: string[],
    newImports?: string[]
  ): ChangeMetadata {
    const isNew = oldContent === null && newContent !== null;
    const isDeletion = oldContent !== null && newContent === null;
    
    const oldHash = oldContent ? this.hash(oldContent) : null;
    const newHash = newContent ? this.hash(newContent) : null;
    
    const oldSize = oldContent?.length ?? 0;
    const newSize = newContent?.length ?? 0;
    const sizeDelta = newSize - oldSize;
    
    const contentChanged = oldHash !== newHash;
    
    // Analyze import changes
    const imports = this.analyzeImports(oldImports, newImports);
    
    const metadata: ChangeMetadata = {
      contentChanged,
      contentHash: {
        old: oldHash,
        new: newHash ?? "",
      },
      imports,
      sizeDelta,
      oldSize,
      newSize,
      timestamp: Date.now(),
      isNew,
      isDeletion,
    };

    this.log?.debug(
      `Change analyzed: contentChanged=${contentChanged}, importsChanged=${imports.changed}, sizeDelta=${sizeDelta}`
    );

    return metadata;
  }

  /**
   * Quick check if content has changed (without full analysis)
   */
  hasContentChanged(oldContent: string | null, newContent: string | null): boolean {
    if (oldContent === null || newContent === null) {
      return oldContent !== newContent;
    }
    return this.hash(oldContent) !== this.hash(newContent);
  }

  /**
   * Get a summary of changes for logging
   */
  getSummary(metadata: ChangeMetadata): string {
    if (metadata.isNew) {
      return `New file (${metadata.newSize} bytes)`;
    }
    if (metadata.isDeletion) {
      return `Deleted file (was ${metadata.oldSize} bytes)`;
    }
    
    const parts: string[] = [];
    
    if (metadata.contentChanged) {
      parts.push(`content changed`);
    }
    
    if (metadata.imports.changed) {
      const { added, removed } = metadata.imports;
      if (added.length > 0) {
        parts.push(`+${added.length} imports`);
      }
      if (removed.length > 0) {
        parts.push(`-${removed.length} imports`);
      }
    }
    
    if (metadata.sizeDelta !== 0) {
      const sign = metadata.sizeDelta > 0 ? "+" : "";
      parts.push(`${sign}${metadata.sizeDelta} bytes`);
    }
    
    return parts.length > 0 ? parts.join(", ") : "No changes";
  }

  /**
   * Check if re-upload is needed based on metadata
   */
  needsReupload(metadata: ChangeMetadata): boolean {
    // New files always need upload
    if (metadata.isNew) return true;
    
    // Deletions need handling
    if (metadata.isDeletion) return true;
    
    // Content changes need upload
    if (metadata.contentChanged) return true;
    
    // Import changes might affect bundling
    if (metadata.imports.changed) return true;
    
    return false;
  }

  /**
   * Analyze import changes
   */
  private analyzeImports(
    oldImports?: string[],
    newImports?: string[]
  ): ImportChanges {
    if (!this.trackImports || (!oldImports && !newImports)) {
      return {
        changed: false,
        added: [],
        removed: [],
        unchanged: [],
      };
    }
    
    const oldSet = new Set(oldImports ?? []);
    const newSet = new Set(newImports ?? []);
    
    const added = [...newSet].filter(i => !oldSet.has(i));
    const removed = [...oldSet].filter(i => !newSet.has(i));
    const unchanged = [...newSet].filter(i => oldSet.has(i));
    
    return {
      changed: added.length > 0 || removed.length > 0,
      added,
      removed,
      unchanged,
    };
  }

  /**
   * Hash content using simple but fast algorithm
   */
  private hash(content: string): string {
    // Simple hash function (djb2)
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) + hash) + content.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}

/**
 * Create a change analyzer instance
 */
export function createChangeAnalyzer(
  options?: ChangeAnalyzerOptions,
  log?: Logger | CategoryLogger
): ChangeAnalyzer {
  return new ChangeAnalyzer(options, log);
}

/**
 * Parse imports from content (simple regex-based)
 * Used when imports aren't provided from DependencyAnalyzer
 */
export function parseImports(content: string): string[] {
  const imports: string[] = [];
  const patterns = [
    // Static imports
    /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s*['"]([^'"]+)['"]/g,
    // Dynamic imports
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    // Export from
    /export\s+(?:type\s+)?(?:\{[^}]*\}|\*)\s*from\s*['"]([^'"]+)['"]/g,
  ];
  
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      imports.push(match[1]);
    }
  }
  
  // Remove duplicates
  return [...new Set(imports)];
}
