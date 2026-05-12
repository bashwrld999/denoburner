/**
 * Composite File Specifications
 * 
 * Specifications that combine multiple specifications.
 */

import type { IFileSpecification, ICompositeSpecification } from "./interfaces.ts";

/**
 * And Specification
 * 
 * Matches files that satisfy ALL specifications.
 */
export class AndSpecification implements ICompositeSpecification {
  private specifications: IFileSpecification[] = [];
  readonly description: string;

  constructor(...specs: IFileSpecification[]) {
    this.specifications = specs;
    this.description = `and(${specs.map(s => s.description).join(", ")})`;
  }

  isSatisfiedBy(file: string): boolean {
    return this.specifications.every(spec => spec.isSatisfiedBy(file));
  }

  add(spec: IFileSpecification): void {
    this.specifications.push(spec);
  }

  remove(spec: IFileSpecification): void {
    const index = this.specifications.indexOf(spec);
    if (index !== -1) {
      this.specifications.splice(index, 1);
    }
  }

  getSpecifications(): IFileSpecification[] {
    return [...this.specifications];
  }
}

/**
 * Or Specification
 * 
 * Matches files that satisfy ANY specification.
 */
export class OrSpecification implements ICompositeSpecification {
  private specifications: IFileSpecification[] = [];
  readonly description: string;

  constructor(...specs: IFileSpecification[]) {
    this.specifications = specs;
    this.description = `or(${specs.map(s => s.description).join(", ")})`;
  }

  isSatisfiedBy(file: string): boolean {
    return this.specifications.some(spec => spec.isSatisfiedBy(file));
  }

  add(spec: IFileSpecification): void {
    this.specifications.push(spec);
  }

  remove(spec: IFileSpecification): void {
    const index = this.specifications.indexOf(spec);
    if (index !== -1) {
      this.specifications.splice(index, 1);
    }
  }

  getSpecifications(): IFileSpecification[] {
    return [...this.specifications];
  }
}

/**
 * Xor Specification
 * 
 * Matches files that satisfy exactly ONE specification.
 */
export class XorSpecification implements IFileSpecification {
  readonly description: string;

  constructor(
    private left: IFileSpecification,
    private right: IFileSpecification,
  ) {
    this.description = `xor(${left.description}, ${right.description})`;
  }

  isSatisfiedBy(file: string): boolean {
    const leftResult = this.left.isSatisfiedBy(file);
    const rightResult = this.right.isSatisfiedBy(file);
    return leftResult !== rightResult; // XOR
  }
}

/**
 * Chain Specification Builder
 * 
 * Fluent builder for creating complex specifications.
 */
export class SpecificationBuilder {
  private specs: IFileSpecification[] = [];

  /**
   * Add a specification that must be satisfied
   */
  and(spec: IFileSpecification): this {
    this.specs.push(spec);
    return this;
  }

  /**
   * Add a specification that must NOT be satisfied
   */
  andNot(spec: IFileSpecification): this {
    this.specs.push(new AndSpecification(new class implements IFileSpecification {
      isSatisfiedBy(file: string): boolean { return !spec.isSatisfiedBy(file); }
      description = `not(${spec.description})`;
    }()));
    return this;
  }

  /**
   * Build the final specification
   */
  build(): IFileSpecification {
    if (this.specs.length === 0) {
      return new class implements IFileSpecification {
        isSatisfiedBy(_file: string): boolean { return true; }
        description = "always";
      }();
    }
    if (this.specs.length === 1) {
      return this.specs[0];
    }
    return new AndSpecification(...this.specs);
  }
}

/**
 * Create an AND specification
 */
export function and(...specs: IFileSpecification[]): AndSpecification {
  return new AndSpecification(...specs);
}

/**
 * Create an OR specification
 */
export function or(...specs: IFileSpecification[]): OrSpecification {
  return new OrSpecification(...specs);
}

/**
 * Create an XOR specification
 */
export function xor(left: IFileSpecification, right: IFileSpecification): XorSpecification {
  return new XorSpecification(left, right);
}

/**
 * Create a specification builder
 */
export function spec(): SpecificationBuilder {
  return new SpecificationBuilder();
}
