import type { IBundler, BundleResult } from "./interface.ts";

export class IdentityBundler implements IBundler {
  async bundle(_filePath: string, content: string, _serverRoot: string): Promise<BundleResult> {
    return { code: content };
  }

  async transpile(_filePath: string, content: string): Promise<BundleResult> {
    return { code: content };
  }

  passthrough(content: string): BundleResult {
    return { code: content };
  }
}
