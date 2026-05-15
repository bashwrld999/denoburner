import { toDenoburnerError } from "../core/errors.ts";

export interface QueuedUpload {
  id: string;
  filePath: string;
  content: string;
  gameServer: string;
  gameFilename: string;
  retries: number;
  maxRetries: number;
  queuedAt: Date;
  lastError?: Error;
}

export type QueueProcessor = (item: QueuedUpload) => Promise<boolean>;

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

let nextId = 0;

function generateId(): string {
  return `${Date.now()}-${nextId++}`;
}

function calculateDelay(attempt: number, config: RetryConfig): number {
  return Math.min(config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt), config.maxDelayMs);
}

export class UploadQueueManager {
  private config: RetryConfig;
  private processor?: QueueProcessor;
  private pending: QueuedUpload[] = [];
  private failed: QueuedUpload[] = [];
  private processing = false;
  private offline = false;
  private timers: Map<string, number> = new Map();

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setProcessor(processor: QueueProcessor): void {
    this.processor = processor;
  }

  enqueue(upload: Omit<QueuedUpload, "id" | "retries" | "maxRetries" | "queuedAt">): QueuedUpload {
    const item: QueuedUpload = {
      ...upload,
      id: generateId(),
      retries: 0,
      maxRetries: this.config.maxRetries,
      queuedAt: new Date(),
    };
    this.pending.push(item);
    this.tryProcess();
    return item;
  }

  setOffline(offline: boolean): void {
    this.offline = offline;
    if (!offline) {
      this.retryAllFailed();
      this.tryProcess();
    }
  }

  isOffline(): boolean {
    return this.offline;
  }

  getStats(): { pending: number; failed: number; processing: boolean; offline: boolean } {
    return { pending: this.pending.length, failed: this.failed.length, processing: this.processing, offline: this.offline };
  }

  retryAllFailed(): void {
    for (const item of this.failed) {
      this.pending.push({ ...item, retries: 0 });
    }
    this.failed = [];
    this.tryProcess();
  }

  retryAllPending(): void {
    for (const item of this.pending) {
      item.retries = 0;
    }
    this.cancelTimers();
    this.tryProcess();
  }

  clearFailed(): void {
    this.failed = [];
    this.cancelTimers();
  }

  clearQueued(): QueuedUpload[] {
    const items = [...this.pending];
    this.pending = [];
    return items;
  }

  stop(): void {
    this.cancelTimers();
    this.processing = false;
  }

  drain(timeoutMs: number = 3000): Promise<{ processed: number; remaining: number }> {
    return new Promise((resolve) => {
      if (this.pending.length === 0 && !this.processing) {
        resolve({ processed: 0, remaining: 0 });
        return;
      }
      const timer = setTimeout(() => {
        const remaining = this.pending.length + this.failed.length;
        this.cancelTimers();
        this.processing = false;
        resolve({ processed: 0, remaining });
      }, timeoutMs);
      const check = () => {
        if (this.pending.length === 0 && !this.processing) {
          clearTimeout(timer);
          resolve({ processed: 0, remaining: this.failed.length });
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }

  private cancelTimers(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  private async tryProcess(): Promise<void> {
    if (this.processing || !this.processor || this.offline || this.pending.length === 0) return;
    this.processing = true;
    try {
      while (this.pending.length > 0 && !this.offline) {
        if (this.offline) break;
        const item = this.pending[0];
        try {
          const success = await this.processor(item);
          if (success) {
            this.pending.shift();
          } else {
            this.handleFailure(this.pending.shift()!, new Error("Upload returned false"));
          }
        } catch (err) {
          this.handleFailure(this.pending.shift()!, toDenoburnerError(err));
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private handleFailure(item: QueuedUpload, error: Error): void {
    item.retries++;
    item.lastError = error;
    if (item.retries > item.maxRetries) {
      this.failed.push(item);
      return;
    }
    const delay = calculateDelay(item.retries - 1, this.config);
    const timer = setTimeout(() => {
      this.timers.delete(item.id);
      this.pending.push(item);
      this.tryProcess();
    }, delay);
    this.timers.set(item.id, timer);
  }
}
