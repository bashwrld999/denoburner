export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  backoff?: "linear" | "exponential";
  onRetry?: (attempt: number, error: Error) => void;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 2;
  const baseDelay = options?.baseDelayMs ?? 200;
  const backoff = options?.backoff ?? "linear";

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        options?.onRetry?.(attempt, lastError);
        const delay = backoff === "exponential"
          ? baseDelay * Math.pow(2, attempt)
          : baseDelay * (attempt + 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error("Retry failed");
}
