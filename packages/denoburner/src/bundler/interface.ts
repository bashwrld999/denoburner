export interface BundleResult {
  code: string;
  map?: string;
}

export interface BundlerStrategy {
  readonly name: string;
  getExternalPatterns(filePath: string): string[];
}

export interface IBundler {
  bundle(filePath: string, content: string, serverRoot: string): Promise<BundleResult>;
  transpile(filePath: string, content: string): Promise<BundleResult>;
  passthrough(content: string): BundleResult;
  close?(): Promise<void>;
}
