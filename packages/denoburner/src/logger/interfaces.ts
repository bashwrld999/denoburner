export type LogLevel = "info" | "success" | "warn" | "error";

export interface ILogger {
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  child(context: Record<string, unknown>): ILogger;
}
