/**
 * Bitburner API Facade
 * 
 * Provides a clean, high-level API for Bitburner operations.
 * Facade pattern - simplifies the JSON-RPC interface.
 */

import type { JsonRpcClient } from "../protocol/json-rpc-client.ts";
import type {
  PushFileParams,
  DeleteFileParams,
  GetFileParams,
  GetFileNamesParams,
  GetAllFilesParams,
  GetScriptRamParams,
  GetFileResult,
  GetFileNamesResult,
  GetAllFilesResult,
  GetScriptRamResult,
  GetDefinitionFileResult,
} from "../types.ts";

/**
 * File data structure
 */
export interface FileData {
  filename: string;
  content: string;
}

/**
 * Bitburner API
 * 
 * Facade for Bitburner Remote API operations.
 * Provides type-safe methods for all API operations.
 */
export class BitburnerApi {
  private client: JsonRpcClient;
  private defaultTimeout: number;

  constructor(client: JsonRpcClient, defaultTimeout: number = 10000) {
    this.client = client;
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Push a file to Bitburner
   */
  async pushFile(server: string, filename: string, content: string): Promise<void> {
    const params: PushFileParams = { server, filename, content };
    await this.client.call("pushFile", params, this.defaultTimeout);
  }

  /**
   * Push multiple files to Bitburner
   */
  async pushFiles(server: string, files: FileData[]): Promise<void> {
    // Push files in parallel for efficiency
    await Promise.all(
      files.map((file) => this.pushFile(server, file.filename, file.content))
    );
  }

  /**
   * Delete a file from Bitburner
   */
  async deleteFile(server: string, filename: string): Promise<void> {
    const params: DeleteFileParams = { server, filename };
    await this.client.call("deleteFile", params, this.defaultTimeout);
  }

  /**
   * Delete multiple files from Bitburner
   */
  async deleteFiles(server: string, filenames: string[]): Promise<void> {
    await Promise.all(
      filenames.map((filename) => this.deleteFile(server, filename))
    );
  }

  /**
   * Get a file's content from Bitburner
   */
  async getFile(server: string, filename: string): Promise<GetFileResult> {
    const params: GetFileParams = { server, filename };
    return this.client.call<GetFileResult>("getFile", params, this.defaultTimeout);
  }

  /**
   * Get all file names on a server
   */
  async getFileNames(server: string): Promise<GetFileNamesResult> {
    const params: GetFileNamesParams = { server };
    return this.client.call<GetFileNamesResult>("getFileNames", params, this.defaultTimeout);
  }

  /**
   * Get all files from a server
   */
  async getAllFiles(server: string): Promise<GetAllFilesResult> {
    const params: GetAllFilesParams = { server };
    return this.client.call<GetAllFilesResult>("getAllFiles", params, this.defaultTimeout);
  }

  /**
   * Get RAM usage of a script
   */
  async getScriptRam(server: string, filename: string): Promise<GetScriptRamResult> {
    const params: GetScriptRamParams = { server, filename };
    return this.client.call<GetScriptRamResult>("calculateRam", params, this.defaultTimeout);
  }

  /**
   * Get the definition file (for TypeScript support)
   */
  async getDefinitionFile(): Promise<GetDefinitionFileResult> {
    return this.client.call<GetDefinitionFileResult>("getDefinitionFile", {}, this.defaultTimeout);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.client.isConnected();
  }
}
