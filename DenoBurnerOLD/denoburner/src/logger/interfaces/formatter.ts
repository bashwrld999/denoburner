/**
 * Argument Formatter Interface
 * 
 * Defines how arguments are formatted for log messages.
 */

/**
 * Argument Formatter
 * 
 * Formats an array of arguments into a single string message.
 * Similar to how console.log formats its arguments.
 */
export interface ArgumentFormatter {
  /**
   * Format arguments into a string
   * @param args - The arguments to format
   * @returns The formatted string
   */
  format(args: unknown[]): string;
}
