export interface PluginHooks {
  beforeBuild?: (localPath: string, content: string) => Promise<string>;
  afterBuild?: (localPath: string, result: string) => Promise<string>;
  beforeUpload?: (server: string, filename: string, content: string) => Promise<void>;
  afterUpload?: (server: string, filename: string, content: string) => Promise<void>;
  onConnect?: (clientId: string) => Promise<void>;
  onDisconnect?: () => Promise<void>;
  onError?: (error: Error, context?: Record<string, unknown>) => Promise<void>;
}

export interface DenoburnerPlugin {
  name: string;
  hooks?: PluginHooks;
}

export interface AggregatedHooks {
  beforeBuild?: (localPath: string, content: string) => Promise<string>;
  afterBuild?: (localPath: string, result: string) => Promise<string>;
  beforeUpload?: (server: string, filename: string, content: string) => Promise<void>;
  afterUpload?: (server: string, filename: string, content: string) => Promise<void>;
}

export function aggregateHooks(plugins: DenoburnerPlugin[]): AggregatedHooks {
  const result: AggregatedHooks = {};

  const beforeBuildFns = plugins.map((p) => p.hooks?.beforeBuild).filter(Boolean) as NonNullable<PluginHooks["beforeBuild"]>[];
  if (beforeBuildFns.length > 0) {
    result.beforeBuild = async (localPath, content) => {
      let c = content;
      for (const fn of beforeBuildFns) c = await fn(localPath, c);
      return c;
    };
  }

  const afterBuildFns = plugins.map((p) => p.hooks?.afterBuild).filter(Boolean) as NonNullable<PluginHooks["afterBuild"]>[];
  if (afterBuildFns.length > 0) {
    result.afterBuild = async (localPath, result) => {
      let r = result;
      for (const fn of afterBuildFns) r = await fn(localPath, r);
      return r;
    };
  }

  const beforeUploadFns = plugins.map((p) => p.hooks?.beforeUpload).filter(Boolean) as NonNullable<PluginHooks["beforeUpload"]>[];
  if (beforeUploadFns.length > 0) {
    result.beforeUpload = async (server, filename, content) => {
      for (const fn of beforeUploadFns) await fn(server, filename, content);
    };
  }

  const afterUploadFns = plugins.map((p) => p.hooks?.afterUpload).filter(Boolean) as NonNullable<PluginHooks["afterUpload"]>[];
  if (afterUploadFns.length > 0) {
    result.afterUpload = async (server, filename, content) => {
      for (const fn of afterUploadFns) await fn(server, filename, content);
    };
  }

  return result;
}
