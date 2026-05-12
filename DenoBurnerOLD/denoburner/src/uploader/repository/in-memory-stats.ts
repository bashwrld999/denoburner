/**
 * In-Memory Stats Repository
 * 
 * Stores upload statistics in memory.
 */

import type { StatsRepository, UploaderStats, FileInfo } from "../interfaces/index.ts";
import type { UploadResult } from "../../types.ts";

/**
 * In-Memory Stats Repository
 * 
 * Simple in-memory implementation of stats tracking.
 * Statistics are lost when the process exits.
 */
export class InMemoryStatsRepository implements StatsRepository {
  private filesUploaded: number = 0;
  private filesWatched: number = 0;
  private totalRam: number = 0;
  private lastUpload: UploaderStats["lastUpload"] = null;
  private files: FileInfo[] = [];

  getStats(): UploaderStats {
    return {
      filesUploaded: this.filesUploaded,
      filesWatched: this.filesWatched,
      totalRam: this.totalRam,
      lastUpload: this.lastUpload,
      files: [...this.files],
    };
  }

  recordUpload(result: UploadResult): void {
    if (!result.success) {
      return;
    }

    this.filesUploaded++;

    const ram = result.ramUsage ?? 0;
    this.totalRam += ram;

    // Add to files list
    this.files.push({
      filename: result.filename,
      server: result.server,
      ram,
    });

    // Update last upload
    this.lastUpload = {
      filename: result.filename,
      server: result.server,
      ram,
      timestamp: new Date(),
    };
  }

  recordDelete(filename: string, server: string): void {
    const index = this.files.findIndex(
      (f) => f.filename === filename && f.server === server
    );

    if (index !== -1) {
      this.totalRam -= this.files[index].ram;
      this.files.splice(index, 1);
    }
  }

  setFilesWatched(count: number): void {
    this.filesWatched = count;
  }

  reset(): void {
    this.filesUploaded = 0;
    this.filesWatched = 0;
    this.totalRam = 0;
    this.lastUpload = null;
    this.files = [];
  }

  getFilesByServer(server: string): FileInfo[] {
    return this.files.filter((f) => f.server === server);
  }

  getRamByServer(server: string): number {
    return this.files
      .filter((f) => f.server === server)
      .reduce((sum, f) => sum + f.ram, 0);
  }
}

/**
 * Create a new in-memory stats repository
 */
export function createStatsRepository(): StatsRepository {
  return new InMemoryStatsRepository();
}
