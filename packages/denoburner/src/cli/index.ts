import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "denoburner",
    version: "3.0.0",
    description: "Bitburner Remote API sync tool",
  },
  subCommands: {
    dev: () => import("./commands/dev.ts").then((m) => m.default),
    build: () => import("./commands/build.ts").then((m) => m.default),
    download: () => import("./commands/download.ts").then((m) => m.default),
    servers: () => import("./commands/servers.ts").then((m) => m.default),
    init: () => import("./commands/init.ts").then((m) => m.default),
    exec: () => import("./commands/exec.ts").then((m) => m.default),
  },
});

runMain(main);
