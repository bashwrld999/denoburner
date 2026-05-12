/**
 * Async config value resolution
 * 
 * Supports async functions, sync functions, promises, and static values.
 */

/**
 * Type for async config values
 */
export type AsyncConfigValue<T> = 
  | T 
  | Promise<T> 
  | (() => T) 
  | (() => Promise<T>);

/**
 * Check if a value is a function
 */
function isFunction(value: unknown): value is () => unknown {
  return typeof value === "function";
}

/**
 * Check if a value is a promise
 */
function isPromise(value: unknown): value is Promise<unknown> {
  return value instanceof Promise || (
    typeof value === "object" && 
    value !== null && 
    "then" in value && 
    typeof (value as Record<string, unknown>).then === "function"
  );
}

/**
 * Resolve an async config value to its final value
 */
export async function resolveAsyncValue<T>(
  value: AsyncConfigValue<T>,
): Promise<T> {
  // Handle function
  if (isFunction(value)) {
    const result = value();
    // If function returns a promise, await it
    if (isPromise(result)) {
      return result as T;
    }
    return result as T;
  }
  
  // Handle promise
  if (isPromise(value)) {
    return value as T;
  }
  
  // Static value
  return value;
}

/**
 * Resolve all async values in an object
 */
export async function resolveAsyncValues<T extends Record<string, unknown>>(
  obj: T,
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    result[key] = await resolveAsyncValue(value as AsyncConfigValue<unknown>);
  }
  
  return result as { [K in keyof T]: Awaited<T[K]> };
}

/**
 * Check if a value needs async resolution
 */
export function isAsyncValue(value: unknown): boolean {
  return isFunction(value) || isPromise(value);
}

/**
 * Deep resolve all async values in an object (including nested objects and arrays)
 */
export async function deepResolveAsync<T>(value: T): Promise<T> {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }
  
  // Handle functions and promises
  if (isFunction(value)) {
    const result = value();
    return deepResolveAsync(isPromise(result) ? await result : result) as T;
  }
  
  if (isPromise(value)) {
    return deepResolveAsync(await value);
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return Promise.all(value.map(deepResolveAsync)) as Promise<T>;
  }
  
  // Handle objects
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = await deepResolveAsync(val);
    }
    return result as T;
  }
  
  // Return primitive values as-is
  return value;
}
