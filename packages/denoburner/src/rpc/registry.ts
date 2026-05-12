import type { IRpcHandler } from "./handlers/types.ts";

export class RpcRegistry {
  private handlers = new Map<string, IRpcHandler>();

  register(handler: IRpcHandler): void {
    if (this.handlers.has(handler.method)) {
      throw new Error(`Handler already registered for method: ${handler.method}`);
    }
    this.handlers.set(handler.method, handler);
  }

  get(method: string): IRpcHandler | undefined {
    return this.handlers.get(method);
  }

  has(method: string): boolean {
    return this.handlers.has(method);
  }

  methods(): string[] {
    return [...this.handlers.keys()];
  }
}
