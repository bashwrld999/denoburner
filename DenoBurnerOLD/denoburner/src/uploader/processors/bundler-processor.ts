/**
 * Bundler Processor
 * 
 * Processes files that need bundling with external dependencies.
 */

import type { FileProcessor } from "../interfaces/index.ts";
import type { HmrData } from "../../types.ts";
import type { ProcessedFile } from "../../bundler/types.ts";
import { Bundler } from "../../bundler/index.ts";
import { DependencyAnalyzer } from "../../analyzer/index.ts";
import { extname } from "jsr:@std/path";

/**
 * Bundler Processor
 * 
 * Handles files that need bundling:
 * - Bundle mode "external": Bundle only external deps (npm, jsr, http)
 * - Bundle mode "all": Bundle everything including local imports
 */
export class BundlerProcessor implements FileProcessor {
  readonly name = "bundler";
  readonly priority = 10;

  private bundler: Bundler;
  private analyzer: DependencyAnalyzer;

  constructor(bundler: Bundler) {
    this.bundler = bundler;
    this.analyzer = new DependencyAnalyzer();
  }

  async canProcess(file: string, data: HmrData): Promise<boolean> {
    // Only process if transform is enabled and bundle mode is set
    if (!data.transform || data.bundle === false) {
      return false;
    }

    // Check if file is TypeScript or JavaScript
    const ext = extname(file);
    const supportedExtensions = [".ts", ".tsx", ".js", ".jsx"];
    if (!supportedExtensions.includes(ext)) {
      return false;
    }

    // For "external" mode, check if bundling is actually needed
    if (data.bundle === "external") {
      // Analyze dependencies to check if external deps exist
      const depInfo = await this.analyzer.analyze(file);
      return depInfo.needsBundling;
    }

    return true;
  }

  async process(file: string, data: HmrData): Promise<ProcessedFile> {
    // Analyze dependencies
    const depInfo = await this.analyzer.analyze(file);

    // For "external" mode, if no external deps, just return raw file
    if (data.bundle === "external" && !depInfo.needsBundling) {
      return this.processRawFile(file, data);
    }

    // If transpile is false and file is TypeScript, return raw
    if (!data.transpile) {
      const ext = extname(file);
      if (ext === ".ts" || ext === ".tsx") {
        return this.processRawFile(file, data);
      }
    }

    // Bundle the file
    const server = this.extractServer(file, data);
    return this.bundler.processFile(file, data.bundle, server, data.transpile);
  }

  private async processRawFile(file: string, data: HmrData): Promise<ProcessedFile> {
    const content = await Deno.readTextFile(file);
    const server = this.extractServer(file, data);

    return {
      filename: file.split("/").pop() || file,
      content,
      bundled: false,
      bundledDeps: 0,
      server,
    };
  }

  private extractServer(file: string, data: HmrData): string {
    const locations = data.location(file);
    return locations[0]?.server || "home";
  }
}
