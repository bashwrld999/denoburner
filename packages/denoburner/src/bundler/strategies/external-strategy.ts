import type { BundlerStrategy } from "../interface.ts";

export class ExternalStrategy implements BundlerStrategy {
  readonly name = "external";
  getExternalPatterns(_filePath: string): string[] { return ["*.d.ts"]; }
}
