import { defineConfig } from "denoburner";

export default defineConfig({
  defaultServer: "home",
  port: 12525,
  host: "localhost",
  watch: [
    { pattern: "src/servers/**/*.{js,ts,jsx,tsx}", mode: "bundle" },
    { pattern: "src/**/*.{txt,script,json}", mode: "passthrough" },
  ],
  ignore: ["**/*.d.ts"],
  sourceMap: false,
  minify: false,
  timeout: 30000,
  ignoreInitial: false,
  serversDir: "src/servers",
  hmr: {
    batchDelay: 100,
    maxCascadeDepth: 10,
  },
});
