/**
 * Denoburner CLI
 * 
 * Command-line interface for the Bitburner development tool.
 */

import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "denoburner",
    version: "0.1.0",
    description: "Bitburner development tool for Deno",
  },
  subCommands: {
    dev: () => import("./commands/dev.ts").then((m) => m.default),
    build: () => import("./commands/build.ts").then((m) => m.default),
    download: () => import("./commands/download.ts").then((m) => m.default),
  },
});

runMain(main);
