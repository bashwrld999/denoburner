/**
 * Result Type - Explicit error handling without exceptions
 * 
 * Inspired by Rust's Result type, this provides a type-safe way to handle
 * operations that can fail without using exceptions.
 * 
 * @example
 * ```ts
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return Result.err('Division by zero');
 *   }
 *   return Result.ok(a / b);
 * }
 * 
 * const result = divide(10, 2);
 * if (Result.isOk(result)) {
 *   console.log(`Result: ${result.value}`);
 * } else {
 *   console.error(`Error: ${result.error}`);
 * }
 * ```
 */

/**
 * Success variant of Result
 */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/**
 * Error variant of Result
 */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/**
 * Result type - either a success (Ok) or failure (Err)
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Namespace with factory functions and type guards for Result
 */
export const Result = {
  /**
   * Create a successful result
   */
  ok<T>(value: T): Ok<T> {
    return { ok: true, value };
  },

  /**
   * Create a failed result
   */
  err<T, E = Error>(error: E): Result<T, E> {
    return { ok: false, error };
  },

  /**
   * Type guard for Ok variant
   */
  isOk<T, E>(result: Result<T, E>): result is Ok<T> {
    return result.ok;
  },

  /**
   * Type guard for Err variant
   */
  isErr<T, E>(result: Result<T, E>): result is Err<E> {
    return !result.ok;
  },

  /**
   * Unwrap the value or throw the error
   * Use only when you're certain the result is Ok
   */
  unwrap<T, E>(result: Result<T, E>): T {
    if (result.ok) {
      return result.value;
    }
    throw result.error;
  },

  /**
   * Unwrap the value or return a default
   */
  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    return result.ok ? result.value : defaultValue;
  },

  /**
   * Map the value if Ok, otherwise return Err unchanged
   */
  map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    return result.ok ? Result.ok(fn(result.value)) : result;
  },

  /**
   * Map the error if Err, otherwise return Ok unchanged
   */
  mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    return result.ok ? result : Result.err(fn(result.error));
  },

  /**
   * Chain operations that return Results
   */
  andThen<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
    return result.ok ? fn(result.value) : result;
  },

  /**
   * Wrap a function that might throw in a Result
   */
  tryCatch<T, E = Error>(fn: () => T, mapError?: (error: unknown) => E): Result<T, E> {
    try {
      return Result.ok(fn());
    } catch (error) {
      return Result.err(mapError ? mapError(error) : error as E);
    }
  },

  /**
   * Wrap an async function that might throw in a Result
   */
  async tryAsync<T, E = Error>(fn: () => Promise<T>, mapError?: (error: unknown) => E): Promise<Result<T, E>> {
    try {
      const value = await fn();
      return Result.ok(value);
    } catch (error) {
      return Result.err(mapError ? mapError(error) : error as E);
    }
  },
} as const;
