import { DenoburnerError, ErrorCodes } from "../core/errors.ts";

export function parsePort(value: string, defaultPort: number = 12525): number {
  const port = parseInt(value);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new DenoburnerError(
      `Invalid port: "${value}". Must be 1-65535.`,
      ErrorCodes.CONFIG_INVALID,
    );
  }
  return port;
}

export function resolvePort(
  argPort: string | undefined,
  envPort: string | undefined,
  configPort: number | undefined,
): number {
  if (argPort) return parsePort(argPort);
  if (envPort) return parsePort(envPort);
  return configPort ?? 12525;
}
