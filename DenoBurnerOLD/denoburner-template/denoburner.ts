import { defineConfig } from "@scope/denoburner";

export default defineConfig({
  port: 12525,
  outDir: "dist",
  sourceMap: false,
  logLevel: "info",

  watch: [
    {
      pattern: "src/servers/**/*.{ts,tsx}",
      transform: true,
      transpile: true,
      bundle: "external", // Only bundle external deps (npm, jsr, http)
    },
    {
      pattern: "src/servers/**/*.{js,jsx}",
      transform: true,
      transpile: false,
      bundle: "all", // Bundle everything
    },
    {
      pattern: "src/servers/**/*.{script,txt}",
      transform: false, // Upload as-is
    },
  ],
});
