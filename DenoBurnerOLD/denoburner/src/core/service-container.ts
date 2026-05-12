/**
 * ServiceContainer - Simple dependency injection container
 * 
 * Provides a lightweight DI container for managing service dependencies.
 * Supports both transient and singleton services.
 * 
 * @example
 * ```ts
 * // Define service tokens
 * const Tokens = {
 *   Config: new ServiceToken<Config>('Config'),
 *   Logger: new ServiceToken<Logger>('Logger'),
 *   Database: new ServiceToken<Database>('Database'),
 * };
 * 
 * // Create container and register services
 * const container = new ServiceContainer();
 * container.registerSingleton(Tokens.Config, () => loadConfig());
 * container.registerSingleton(Tokens.Logger, (c) => new Logger(c.get(Tokens.Config)));
 * container.register(Tokens.Database, (c) => new Database(c.get(Tokens.Config)));
 * 
 * // Resolve services
 * const logger = container.get(Tokens.Logger);
 * ```
 */

/**
 * Service token for type-safe service resolution
 */
export class ServiceToken<T> {
  constructor(public readonly name: string) {}
  
  toString(): string {
    return `ServiceToken(${this.name})`;
  }
}

/**
 * Factory function for creating services
 */
export type ServiceFactory<T> = (container: ServiceContainer) => T;

/**
 * Service registration entry
 */
interface ServiceEntry<T> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: T;
}

/**
 * Service Container interface
 */
export interface IServiceContainer {
  get<T>(token: ServiceToken<T>): T;
  has<T>(token: ServiceToken<T>): boolean;
  register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void;
  registerSingleton<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void;
}

/**
 * Service Container implementation
 */
export class ServiceContainer implements IServiceContainer {
  private services = new Map<ServiceToken<unknown>, ServiceEntry<unknown>>();

  /**
   * Check if a service is registered
   */
  has<T>(token: ServiceToken<T>): boolean {
    return this.services.has(token);
  }

  /**
   * Get a service by token
   * @throws Error if service is not registered
   */
  get<T>(token: ServiceToken<T>): T {
    const entry = this.services.get(token) as ServiceEntry<T> | undefined;
    
    if (!entry) {
      throw new Error(`Service not registered: ${token.name}`);
    }

    // Return cached singleton instance
    if (entry.singleton && entry.instance !== undefined) {
      return entry.instance;
    }

    // Create new instance
    const instance = entry.factory(this);

    // Cache singleton
    if (entry.singleton) {
      entry.instance = instance;
    }

    return instance;
  }

  /**
   * Register a transient service (new instance each time)
   */
  register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void {
    this.services.set(token, {
      factory,
      singleton: false,
    });
  }

  /**
   * Register a singleton service (same instance every time)
   */
  registerSingleton<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void {
    this.services.set(token, {
      factory,
      singleton: true,
    });
  }

  /**
   * Register an existing instance as a singleton
   */
  registerInstance<T>(token: ServiceToken<T>, instance: T): void {
    this.services.set(token, {
      factory: () => instance,
      singleton: true,
      instance,
    });
  }

  /**
   * Remove a service registration
   */
  remove<T>(token: ServiceToken<T>): boolean {
    return this.services.delete(token);
  }

  /**
   * Clear all service registrations
   */
  clear(): void {
    this.services.clear();
  }
}
