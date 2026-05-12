/**
 * Initial Upload Orchestrator
 * 
 * Handles the initial upload of all files when the server connects.
 * Extracted from EventMediator for better separation of concerns.
 */

import type { WatcherImpl } from "../watcher/watcher.ts";
import type { UploaderOrchestrator } from "./uploader.ts";
import type { DenoburnerStateStore, FileCache } from "../state/index.ts";
import type { TuiFacade } from "../tui/index.ts";
import type { ResolvedDenoBurnerConfig } from "../config/types.ts";
import type { HmrData } from "../types.ts";
import type { Logger, CategoryLogger } from "../logger/interfaces/index.ts";
import type { DependencyAnalyzer } from "../analyzer/index.ts";
import type { DependencyGraph } from "../watcher/index.ts";

/**
 * Dependencies for InitialUploadOrchestrator
 */
export interface InitialUploadDeps {
  watcher: WatcherImpl;
  uploader: UploaderOrchestrator;
  stateStore: DenoburnerStateStore;
  fileCache: FileCache;
  tui: TuiFacade;
  config: ResolvedDenoBurnerConfig;
  log: Logger | CategoryLogger;
  dependencyAnalyzer?: DependencyAnalyzer;
  dependencyGraph?: DependencyGraph;
}

/**
 * File check result
 */
interface FileCheckResult {
  needsUpload: boolean;
  file: string;
  item: NonNullable<ReturnType<WatcherImpl["findItem"]>>;
  locations: Array<{ filename: string; server: string }>;
}

/**
 * Upload statistics
 */
export interface UploadStats {
  total: number;
  uploaded: number;
  skipped: number;
  failed: number;
}

/**
 * Initial Upload Orchestrator
 * 
 * Coordinates the initial upload of all watched files.
 * Uses parallel checking and respects the upload strategy.
 */
export class InitialUploadOrchestrator {
  private deps: InitialUploadDeps;
  private skippedCount = 0;

  constructor(deps: InitialUploadDeps) {
    this.deps = deps;
  }

  /**
   * Execute the initial upload
   */
  async execute(): Promise<UploadStats> {
    const { watcher, uploader, stateStore, log } = this.deps;

    log.info("Uploading initial files...");
    
    // Get all files from watcher
    const files = await watcher.getAllFiles();
    stateStore.dispatch({ type: "files/watched", count: files.length });
    uploader.setFilesWatched(files.length);

    // Check which files need upload
    const checkResults = await this.checkFiles(files);
    
    // Collect files to upload and analyze dependencies
    const filesToUpload = await this.collectFilesToUpload(checkResults);
    
    // Track skipped count
    this.skippedCount = checkResults.filter(r => r && !r.needsUpload).length;

    // Upload files
    const uploadResults = await uploader.uploadFiles(filesToUpload);
    
    // Process results
    const stats = this.processResults(uploadResults);
    
    this.logResults(stats);
    
    return stats;
  }

  /**
   * Check which files need upload (parallel check for speed)
   */
  private async checkFiles(files: string[]): Promise<(FileCheckResult | null)[]> {
    const { watcher, fileCache } = this.deps;
    
    const checkPromises = files.map(async (file): Promise<FileCheckResult | null> => {
      const item = watcher.findItem(file);
      if (!item) return null;

      const locations = item.location(file);
      
      // Check if file needs upload (content changed)
      for (const { filename, server } of locations) {
        const changed = await fileCache.needsUpload(file, server, filename);
        if (!changed) {
          return { needsUpload: false, file, item, locations };
        }
      }
      
      return { needsUpload: true, file, item, locations };
    });

    return Promise.all(checkPromises);
  }

  /**
   * Collect files that need upload into HmrData array
   * Also analyzes dependencies for all files to populate the dependency graph
   */
  private async collectFilesToUpload(checkResults: (FileCheckResult | null)[]): Promise<HmrData[]> {
    const { dependencyAnalyzer, dependencyGraph, fileCache, log } = this.deps;
    const filesToUpload: HmrData[] = [];

    // First, analyze all files to populate the dependency graph
    // This must be done before any file changes can trigger cascading updates
    if (dependencyAnalyzer && dependencyGraph) {
      const analysisPromises: Promise<void>[] = [];
      
      for (const result of checkResults) {
        if (!result) continue;
        
        const { file, item, locations } = result;
        
        // Analyze all files (including cascade-only) for dependency tracking
        analysisPromises.push(
          dependencyAnalyzer.analyze(file)
            .then(async (fileInfo) => {
              // For cascade-only files, server is null
              const server = item.cascadeOnly ? null : (locations[0]?.server ?? "home");
              dependencyGraph.updateFromFile(file, fileInfo, server);
              
              // For cascade-only files, also populate the hash cache
              if (item.cascadeOnly && fileCache) {
                try {
                  const content = await Deno.readTextFile(file);
                  // Use the public hash method if available, otherwise compute ourselves
                  const hash = await fileCache.hash(content);
                  fileCache.setCascadeOnlyHash(file, hash);
                } catch {
                  // Ignore errors reading file
                }
              }
            })
            .catch(() => {
              // Ignore analysis errors during initial upload
            })
        );
      }
      
      // Wait for all analysis to complete before proceeding
      await Promise.all(analysisPromises);
      log.debug(`Analyzed ${analysisPromises.length} files for dependency tracking`);
    }

    // Now collect files to upload (excluding cascade-only)
    for (const result of checkResults) {
      if (!result || !result.needsUpload) continue;

      const { file, item } = result;

      // Skip cascade-only files (they're only for cascading updates, not upload)
      if (item.cascadeOnly) {
        log.debug(`Skipping cascade-only file: ${file}`);
        continue;
      }

      filesToUpload.push({
        file,
        event: "create",
        timestamp: Date.now(),
        pattern: item.pattern,
        transform: item.transform,
        bundle: item.bundle,
        transpile: item.transpile,
        location: item.location,
        cascadeOnly: item.cascadeOnly,
      });
    }

    return filesToUpload;
  }

  /**
   * Process upload results into statistics
   */
  private processResults(results: Awaited<ReturnType<UploaderOrchestrator["uploadFiles"]>>): UploadStats {
    let uploaded = 0;
    let failed = 0;

    for (const result of results) {
      if (result.success) {
        uploaded++;
      } else {
        failed++;
      }
    }

    return {
      total: uploaded + failed + this.skippedCount,
      uploaded,
      skipped: this.skippedCount,
      failed,
    };
  }

  /**
   * Log upload results
   */
  private logResults(stats: UploadStats): void {
    const { log } = this.deps;

    if (stats.failed > 0) {
      log.warn(`Uploaded ${stats.uploaded} files, ${stats.failed} failed, ${stats.skipped} unchanged`);
    } else if (stats.skipped > 0) {
      log.success(`Uploaded ${stats.uploaded} files, ${stats.skipped} unchanged`);
    } else {
      log.success(`Uploaded ${stats.uploaded} files`);
    }
  }
}

/**
 * Create an initial upload orchestrator
 */
export function createInitialUploadOrchestrator(deps: InitialUploadDeps): InitialUploadOrchestrator {
  return new InitialUploadOrchestrator(deps);
}
