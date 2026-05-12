export type BundleMode = "passthrough" | "transpile" | "bundle";

export interface WatchEntry {
  pattern: string;
  mode: BundleMode;
  server?: string;
}

export interface HmrConfig {
  batchDelay?: number;
  maxCascadeDepth?: number;
}

export interface DenoburnerConfig {
  outDir?: string;
  defaultServer: string;
  port: number;
  host: string;
  watch: WatchEntry[];
  ignore?: string[];
  sourceMap?: boolean;
  minify?: boolean;
  timeout?: number;
  ignoreInitial?: boolean;
  serversDir?: string;
  hmr?: HmrConfig;
  logFile?: string;
}

export const DEFAULT_CONFIG: DenoburnerConfig = {
  defaultServer: "home",
  port: 12525,
  host: "localhost",
  watch: [
    { pattern: "src/servers/**/*.{js,ts,jsx,tsx}", mode: "bundle" },
    { pattern: "src/**/*.{script,txt,json}", mode: "passthrough" },
  ],
};
