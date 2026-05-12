/**
 * Basic File Specifications
 * 
 * Common specifications for file matching.
 */

import type { IFileSpecification } from "./interfaces.ts";
import { globToRegExp } from "jsr:@std/path/posix";

/**
 * Pattern Specification
 * 
 * Matches files against a glob pattern.
 */
export class PatternSpecification implements IFileSpecification {
  private regex: RegExp;
  readonly description: string;

  constructor(pattern: string) {
    this.regex = globToRegExp(pattern, { extended: true, globstar: true });
    this.description = `pattern:${pattern}`;
  }

  isSatisfiedBy(file: string): boolean {
    const normalized = file.replaceAll("\\", "/");
    return this.regex.test(normalized);
  }
}

/**
 * Extension Specification
 * 
 * Matches files by extension.
 */
export class ExtensionSpecification implements IFileSpecification {
  private extensions: Set<string>;
  readonly description: string;

  constructor(extensions: string | string[]) {
    const exts = Array.isArray(extensions) ? extensions : [extensions];
    this.extensions = new Set(exts.map(e => e.startsWith(".") ? e : `.${e}`));
    this.description = `extension:${exts.join(",")}`;
  }

  isSatisfiedBy(file: string): boolean {
    const normalized = file.replaceAll("\\", "/");
    const ext = normalized.substring(normalized.lastIndexOf("."));
    return this.extensions.has(ext);
  }
}

/**
 * Directory Specification
 * 
 * Matches files in a specific directory.
 */
export class DirectorySpecification implements IFileSpecification {
  private dirPath: string;
  readonly description: string;

  constructor(directory: string) {
    this.dirPath = directory.replaceAll("\\", "/").replace(/\/+$/, "");
    this.description = `directory:${this.dirPath}`;
  }

  isSatisfiedBy(file: string): boolean {
    const normalized = file.replaceAll("\\", "/");
    return normalized.startsWith(this.dirPath + "/");
  }
}

/**
 * Regex Specification
 * 
 * Matches files against a regular expression.
 */
export class RegexSpecification implements IFileSpecification {
  readonly description: string;

  constructor(
    private regex: RegExp,
    description?: string,
  ) {
    this.description = description ?? `regex:${regex.source}`;
  }

  isSatisfiedBy(file: string): boolean {
    const normalized = file.replaceAll("\\", "/");
    return this.regex.test(normalized);
  }
}

/**
 * Not Specification
 * 
 * Negates another specification.
 */
export class NotSpecification implements IFileSpecification {
  readonly description: string;

  constructor(
    private spec: IFileSpecification,
  ) {
    this.description = `not(${spec.description})`;
  }

  isSatisfiedBy(file: string): boolean {
    return !this.spec.isSatisfiedBy(file);
  }
}

/**
 * Always Specification
 * 
 * Always matches or never matches.
 */
export class AlwaysSpecification implements IFileSpecification {
  readonly description: string;

  constructor(private value: boolean = true) {
    this.description = value ? "always" : "never";
  }

  isSatisfiedBy(_file: string): boolean {
    return this.value;
  }
}

/**
 * Create a pattern specification
 */
export function pattern(pattern: string): PatternSpecification {
  return new PatternSpecification(pattern);
}

/**
 * Create an extension specification
 */
export function extension(extensions: string | string[]): ExtensionSpecification {
  return new ExtensionSpecification(extensions);
}

/**
 * Create a directory specification
 */
export function directory(dir: string): DirectorySpecification {
  return new DirectorySpecification(dir);
}

/**
 * Create a regex specification
 */
export function regex(pattern: RegExp, description?: string): RegexSpecification {
  return new RegexSpecification(pattern, description);
}

/**
 * Create a not specification
 */
export function not(spec: IFileSpecification): NotSpecification {
  return new NotSpecification(spec);
}

/**
 * Create an always-true specification
 */
export function always(): AlwaysSpecification {
  return new AlwaysSpecification(true);
}

/**
 * Create a never-match specification
 */
export function never(): AlwaysSpecification {
  return new AlwaysSpecification(false);
}
