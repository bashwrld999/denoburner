/**
 * Config migration system
 * 
 * Handles breaking changes in config format between versions.
 */

import type { DenoBurnerUserConfig } from "./types.ts";

/**
 * Config migration definition
 */
export interface ConfigMigration {
  /** Version migrating from */
  fromVersion: string;
  /** Version migrating to */
  toVersion: string;
  /** Migration function */
  migrate(config: unknown): unknown;
  /** Description of changes */
  description?: string;
}

/**
 * Semantic version parts
 */
interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Parse semantic version string
 */
function parseSemVer(version: string): SemVer | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Compare two semantic versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareSemVer(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}

/**
 * Built-in migrations
 */
const BUILTIN_MIGRATIONS: ConfigMigration[] = [
  // Example migration (will be updated as versions change)
  // {
  //   fromVersion: "0.1.0",
  //   toVersion: "0.2.0",
  //   description: "Rename bundleMode to bundle",
  //   migrate(config: unknown) {
  //     const c = config as Record<string, unknown>;
  //     if (c.bundleMode !== undefined) {
  //       c.bundle = c.bundleMode;
  //       delete c.bundleMode;
  //     }
  //     return c;
  //   },
  // },
];

/**
 * Migration manager
 */
export class MigrationManager {
  private migrations: ConfigMigration[] = [];
  private currentVersion: string;
  
  constructor(currentVersion: string = "0.1.0") {
    this.currentVersion = currentVersion;
    this.migrations = [...BUILTIN_MIGRATIONS];
  }
  
  /**
   * Register a migration
   */
  register(migration: ConfigMigration): void {
    this.migrations.push(migration);
  }
  
  /**
   * Get all migrations
   */
  getMigrations(): ConfigMigration[] {
    return [...this.migrations];
  }
  
  /**
   * Migrate config from one version to another
   */
  migrate(
    config: unknown,
    fromVersion: string,
    toVersion?: string,
  ): unknown {
    const targetVersion = toVersion ?? this.currentVersion;
    
    // Parse versions
    const from = parseSemVer(fromVersion);
    const to = parseSemVer(targetVersion);
    
    if (!from || !to) {
      console.warn(
        `Invalid version format: ${fromVersion} or ${targetVersion}`,
      );
      return config;
    }
    
    // Already at or past target version
    if (compareSemVer(from, to) >= 0) {
      return config;
    }
    
    // Sort migrations by version
    const sortedMigrations = [...this.migrations].sort((a, b) => {
      const aFrom = parseSemVer(a.fromVersion);
      const bFrom = parseSemVer(b.fromVersion);
      if (!aFrom || !bFrom) return 0;
      return compareSemVer(aFrom, bFrom);
    });
    
    // Apply migrations in order
    let current = config;
    let currentVer = fromVersion;
    
    for (const migration of sortedMigrations) {
      const migrationFrom = parseSemVer(migration.fromVersion);
      const migrationTo = parseSemVer(migration.toVersion);
      
      if (!migrationFrom || !migrationTo) continue;
      
      // Check if this migration should be applied
      if (
        compareSemVer(migrationFrom, parseSemVer(currentVer)!) >= 0 &&
        compareSemVer(migrationTo, to) <= 0
      ) {
        console.log(
          `Migrating config from ${migration.fromVersion} to ${migration.toVersion}`,
        );
        current = migration.migrate(current);
        currentVer = migration.toVersion;
      }
    }
    
    // Update version in config
    if (
      typeof current === "object" &&
      current !== null
    ) {
      (current as Record<string, unknown>).version = targetVersion;
    }
    
    return current;
  }
  
  /**
   * Check if migration is needed
   */
  needsMigration(config: DenoBurnerUserConfig): boolean {
    if (!config.version) return false;
    
    const from = parseSemVer(config.version);
    const to = parseSemVer(this.currentVersion);
    
    if (!from || !to) return false;
    
    return compareSemVer(from, to) < 0;
  }
  
  /**
   * Get migration path from one version to another
   */
  getMigrationPath(fromVersion: string, toVersion?: string): ConfigMigration[] {
    const targetVersion = toVersion ?? this.currentVersion;
    const from = parseSemVer(fromVersion);
    const to = parseSemVer(targetVersion);
    
    if (!from || !to) return [];
    
    return this.migrations
      .filter((m) => {
        const mFrom = parseSemVer(m.fromVersion);
        const mTo = parseSemVer(m.toVersion);
        if (!mFrom || !mTo) return false;
        
        return (
          compareSemVer(mFrom, from) >= 0 &&
          compareSemVer(mTo, to) <= 0
        );
      })
      .sort((a, b) => {
        const aFrom = parseSemVer(a.fromVersion);
        const bFrom = parseSemVer(b.fromVersion);
        if (!aFrom || !bFrom) return 0;
        return compareSemVer(aFrom, bFrom);
      });
  }
}

/**
 * Default migration manager instance
 */
export const migrationManager = new MigrationManager();

/**
 * Migrate config using default manager
 */
export function migrateConfig(
  config: unknown,
  fromVersion: string,
  toVersion?: string,
): unknown {
  return migrationManager.migrate(config, fromVersion, toVersion);
}
