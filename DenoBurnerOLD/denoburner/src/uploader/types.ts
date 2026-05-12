/**
 * Types for the File Uploader module
 */

/**
 * Stats for the uploader
 */
export interface UploaderStats {
  /** Total files uploaded */
  filesUploaded: number;
  /** Total files watched */
  filesWatched: number;
  /** Total RAM usage in GB */
  totalRam: number;
  /** Last upload info */
  lastUpload: {
    filename: string;
    server: string;
    ram: number;
    timestamp: Date;
  } | null;
  /** All files with their RAM usage */
  files: Array<{ filename: string; server: string; ram: number }>;
}
