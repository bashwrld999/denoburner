/**
 * File Specification Interfaces
 * 
 * Specification Pattern for file matching.
 * Allows composable, reusable file matching rules.
 */

/**
 * File Specification
 * 
 * Determines if a file path satisfies a specific condition.
 * Uses the Specification Pattern for composable matching rules.
 */
export interface IFileSpecification {
  /**
   * Check if the file satisfies this specification
   * @param file - File path (relative to project root)
   * @returns true if the file satisfies the specification
   */
  isSatisfiedBy(file: string): boolean;

  /**
   * Get a description of this specification
   */
  readonly description?: string;
}

/**
 * Composite specification that combines multiple specifications
 */
export interface ICompositeSpecification extends IFileSpecification {
  /**
   * Add a specification to this composite
   * @param spec - Specification to add
   */
  add(spec: IFileSpecification): void;

  /**
   * Remove a specification from this composite
   * @param spec - Specification to remove
   */
  remove(spec: IFileSpecification): void;

  /**
   * Get all specifications in this composite
   */
  getSpecifications(): IFileSpecification[];
}
