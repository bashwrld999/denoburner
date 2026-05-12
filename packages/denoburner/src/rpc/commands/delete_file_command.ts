import type { RpcCommand } from "../command.ts";

export interface DeleteFileParams {
  server: string;
  filename: string;
}

export class DeleteFileCommand implements RpcCommand<void> {
  readonly method = "deleteFile";
  readonly params: DeleteFileParams;

  constructor(params: DeleteFileParams) {
    this.params = params;
  }

  parseResponse(raw: unknown): void {
    if (raw === true || raw === "OK") return;
    if (typeof raw === "object" && raw !== null && (raw as Record<string, unknown>).success === true) return;
    throw new Error(`Unexpected response for deleteFile: ${JSON.stringify(raw)}`);
  }
}
