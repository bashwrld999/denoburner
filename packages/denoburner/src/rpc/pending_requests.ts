export interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timer?: number;
  method: string;
}

export class PendingRequestMap {
  private map = new Map<number, PendingRequest>();
  private nextId = 1;
  private defaultTimeoutMs: number;

  constructor(defaultTimeoutMs = 30_000) {
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  add(method: string, timeoutMs?: number): { id: number; promise: Promise<unknown> } {
    const id = this.nextId++;
    const promise = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.map.delete(id);
        reject(new Error(`RPC request "${method}" (#${id}) timed out after ${timeoutMs ?? this.defaultTimeoutMs}ms`));
      }, timeoutMs ?? this.defaultTimeoutMs);

      this.map.set(id, { resolve, reject, timer, method });
    });

    return { id, promise };
  }

  resolve(id: number, result: unknown): void {
    const pending = this.map.get(id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.map.delete(id);
    pending.resolve(result);
  }

  reject(id: number, error: Error): void {
    const pending = this.map.get(id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.map.delete(id);
    pending.reject(error);
  }

  rejectAll(error: Error): void {
    for (const [id, pending] of this.map) {
      clearTimeout(pending.timer);
      this.map.delete(id);
      pending.reject(error);
    }
  }

  get size(): number {
    return this.map.size;
  }
}
