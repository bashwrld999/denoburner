/// <reference lib="dom" />

import type { NS as NS_type } from "./NetscriptDefinitions.d.ts";

declare global {
  type NS = NS_type;
}

// CSS module declarations
// CSS files are converted to CSSStyleSheet and automatically injected into the document
// Use cleanup function with ns.atExit(cleanup) to remove styles when script exits
declare module "*.css" {
  const sheet: CSSStyleSheet;
  function inject(): void;
  function cleanup(): void;
  export default sheet;
  export { inject, cleanup };
}

declare module "*.scss" {
  const sheet: CSSStyleSheet;
  function inject(): void;
  function cleanup(): void;
  export default sheet;
  export { inject, cleanup };
}

declare module "*.sass" {
  const sheet: CSSStyleSheet;
  function inject(): void;
  function cleanup(): void;
  export default sheet;
  export { inject, cleanup };
}

declare module "*.less" {
  const sheet: CSSStyleSheet;
  function inject(): void;
  function cleanup(): void;
  export default sheet;
  export { inject, cleanup };
}

export {};
