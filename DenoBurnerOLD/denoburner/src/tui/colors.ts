/**
 * ANSI Color codes
 */
export const colors = {
  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",
  // Background colors
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
  // Styles
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
} as const;

export type ColorName = keyof typeof colors;

/**
 * Get color code by name
 */
export function getColor(name: string): string {
  return colors[name as ColorName] ?? colors.white;
}

/**
 * Colorize text
 */
export function colorize(text: string, color: string): string {
  return `${getColor(color)}${text}${colors.reset}`;
}

/**
 * Colorize text with background
 */
export function colorizeWithBg(text: string, fgColor: string, bgColor: string): string {
  return `${getColor(bgColor)}${getColor(fgColor)}${text}${colors.reset}`;
}
