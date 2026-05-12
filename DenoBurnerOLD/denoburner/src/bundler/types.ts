/**
 * Types for the Smart Bundler module
 */

/**
 * Bundling mode
 */
export type BundleMode = "external" | "all" | false;

/**
 * Options for the smart bundler
 */
export interface BundlerOptions {
  /** Generate source maps */
  sourceMap: boolean;
  /** Minify output */
  minify: boolean;
  /** Target ES version */
  target: string;
}

/**
 * Result of bundling a file
 */
export interface BundledFile {
  /** Output filename (may differ from input if transformed) */
  filename: string;
  /** Bundled content */
  content: string;
  /** Source map content (if enabled) */
  sourceMap?: string;
  /** Whether the file was bundled */
  bundled: boolean;
  /** Number of external dependencies that were bundled */
  bundledDeps: number;
}

/**
 * Result of processing a file (bundled or not)
 */
export interface ProcessedFile {
  /** Output filename */
  filename: string;
  /** File content */
  content: string;
  /** Source map content (if enabled) */
  sourceMap?: string;
  /** Whether the file was bundled */
  bundled: boolean;
  /** Number of bundled dependencies */
  bundledDeps: number;
  /** Server to upload to */
  server: string;
}
