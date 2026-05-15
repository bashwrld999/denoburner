export const ErrorCodes = {
  CONFIG_INVALID: "CONFIG_INVALID",
  CONFIG_V1_DETECTED: "CONFIG_V1_DETECTED",
  CONFIG_MISSING: "CONFIG_MISSING",
  NETWORK_DISCONNECTED: "NETWORK_DISCONNECTED",
  NETWORK_TIMEOUT: "NETWORK_TIMEOUT",
  RPC_ERROR: "RPC_ERROR",
  RPC_METHOD_NOT_FOUND: "RPC_METHOD_NOT_FOUND",
  PIPELINE_STAGE_FAILED: "PIPELINE_STAGE_FAILED",
  WATCHER_ACCESS_DENIED: "WATCHER_ACCESS_DENIED",
  BUNDLE_FAILED: "BUNDLE_FAILED",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class DenoburnerError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode = ErrorCodes.UNKNOWN,
    public readonly context: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "DenoburnerError";
  }
}

export class ConfigError extends DenoburnerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCodes.CONFIG_INVALID, context);
    this.name = "ConfigError";
  }
}

export class NetworkError extends DenoburnerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCodes.NETWORK_DISCONNECTED, context);
    this.name = "NetworkError";
  }
}

export class RpcError extends DenoburnerError {
  constructor(
    message: string,
    public readonly rpcCode?: number,
    context?: Record<string, unknown>,
  ) {
    super(message, ErrorCodes.RPC_ERROR, context);
    this.name = "RpcError";
  }
}

export class PipelineError extends DenoburnerError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(message, ErrorCodes.PIPELINE_STAGE_FAILED, context);
    this.name = "PipelineError";
  }
}

export class WatcherError extends DenoburnerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCodes.WATCHER_ACCESS_DENIED, context);
    this.name = "WatcherError";
  }
}

export function toDenoburnerError(
  err: unknown,
  defaultCode: ErrorCode = ErrorCodes.UNKNOWN,
  context?: Record<string, unknown>,
): DenoburnerError {
  if (err instanceof DenoburnerError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new DenoburnerError(message, defaultCode, context);
}
