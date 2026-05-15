export type BundleMode = "passthrough" | "transpile" | "bundle";

export interface PatternEntry {
  pattern: string;
  mode: BundleMode;
}

export interface SourceEntry {
  dir: string;
  mode?: BundleMode;
  server?: string;
  patterns?: PatternEntry[];
}

export interface HmrConfig {
  batchDelay?: number;
  maxCascadeDepth?: number;
}

export interface BundleConfig {
  sourceMap?: boolean;
  minify?: boolean;
}

export interface DenoburnerConfig {
  host?: string;
  port?: number;
  defaultServer?: string;
  sources?: SourceEntry[];
  bundle?: BundleConfig;
  hmr?: HmrConfig;
  plugins?: string[];
  logFile?: string;
  skipInitialSync?: boolean;
  timeout?: number;
}

export const DEFAULT_CONFIG: DenoburnerConfig = {
  defaultServer: "home",
  port: 12525,
  host: "localhost",
  sources: [{ dir: "src" }],
  timeout: 30_000,
};
