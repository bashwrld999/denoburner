import { defineConfig } from "denoburner";

export default defineConfig({
  sources: [
    {
      dir: "src/servers",
      patterns: [
        { pattern: "**/*.{js,ts,jsx,tsx}", mode: "bundle" },
        { pattern: "**/*.{script,txt,json}", mode: "passthrough" },
      ],
    },
  ],
  bundle: {
    sourceMap: false,
    minify: false,
  },
});
