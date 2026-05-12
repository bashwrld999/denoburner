import type { RpcCommand } from "../command.ts";

export interface CalculateRamParams {
  filename: string;
  server?: string;
}

export interface CalculateRamResult {
  ram: number;
}

export class CalculateRamCommand implements RpcCommand<CalculateRamResult> {
  readonly method = "calculateRam";

  constructor(public readonly params: CalculateRamParams) {}

  parseResponse(raw: unknown): CalculateRamResult {
    if (typeof raw === "number") return { ram: raw };
    if (typeof raw === "object" && raw !== null && typeof (raw as Record<string, unknown>).ram === "number") {
      return { ram: (raw as Record<string, unknown>).ram as number };
    }
    throw new Error(`calculateRam: unexpected response: ${JSON.stringify(raw)}`);
  }
}
