/**
 * File Specifications
 * 
 * Specification Pattern for composable file matching.
 */

// Interfaces
export type { IFileSpecification, ICompositeSpecification } from "./interfaces.ts";

// Basic specifications
export {
  PatternSpecification,
  ExtensionSpecification,
  DirectorySpecification,
  RegexSpecification,
  NotSpecification,
  AlwaysSpecification,
  pattern,
  extension,
  directory,
  regex,
  not,
  always,
  never,
} from "./basic-specifications.ts";

// Composite specifications
export {
  AndSpecification,
  OrSpecification,
  XorSpecification,
  SpecificationBuilder,
  and,
  or,
  xor,
  spec,
} from "./composite-specifications.ts";

// Watch item specification
export {
  WatchItemSpecification,
  watchItemSpec,
} from "./watch-item-specification.ts";

// Convenience re-exports
export type { IFileSpecification as FileSpec } from "./interfaces.ts";
