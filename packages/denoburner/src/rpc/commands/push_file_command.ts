import type { RpcCommand } from "../command.ts";

export interface PushFileParams {
  filename: string;
  content: string;
  server: string;
}

export interface PushFileResult {
  success: true;
}

export class PushFileCommand implements RpcCommand<PushFileResult> {
  readonly method = "pushFile";

  constructor(public readonly params: PushFileParams) {}

  parseResponse(raw: unknown): PushFileResult {
    if (raw === true) return { success: true };
    if (raw === "OK") return { success: true };
    if (typeof raw === "object" && raw !== null && (raw as Record<string, unknown>).success === true) {
      return { success: true };
    }
    throw new Error(`pushFile: unexpected response: ${JSON.stringify(raw)}`);
  }
}
