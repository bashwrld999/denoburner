/**
 * Upload Strategy Interface
 * 
 * Strategy pattern for different upload behaviors.
 */

import type { UploadResult } from "../../types.ts";
import type { ProcessedFile } from "../../bundler/types.ts";

/**
 * Item to upload
 */
export interface UploadItem {
  /** Processed file content */
  file: ProcessedFile;
  /** Original file path */
  originalPath: string;
  /** Target server */
  server: string;
  /** Timestamp when upload was requested */
  timestamp: number;
}

/**
 * Upload Strategy
 * 
 * Defines how files are uploaded to Bitburner.
 * Implementations can provide different behaviors:
 * - Immediate: Upload files as they come
 * - Batched: Collect files and upload in batches
 * - Queued: Queue uploads with retry logic
 */
export interface UploadStrategy {
  /**
   * Strategy name for identification
   */
  readonly name: string;

  /**
   * Upload a single item
   * @param item - Item to upload
   * @returns Upload result
   */
  upload(item: UploadItem): Promise<UploadResult>;

  /**
   * Upload multiple items
   * @param items - Items to upload
   * @returns Upload results
   */
  uploadAll(items: UploadItem[]): Promise<UploadResult[]>;

  /**
   * Check if strategy is ready to upload
   * (e.g., batch has enough items, queue is not full)
   */
  isReady(): boolean;

  /**
   * Flush any pending uploads
   * (e.g., for batched strategy)
   */
  flush?(): Promise<UploadResult[]>;
}
