import { defineCommand } from "citty";
import { resolve, dirname, join } from "@std/path";
import { ensureDir } from "@std/fs";
import { validateConfig } from "../../config/loader.ts";

const CONFIG_CONTENT = `import { defineConfig } from "denoburner";

export default defineConfig({
  sources: [
    { dir: "src" },
  ],
});
`;

const DENO_JSON_CONTENT = `{
  "tasks": {
    "dev": "deno run -A denoburner/cli dev",
    "build": "deno run -A denoburner/cli build"
  },
  "imports": {
    "denoburner": "jsr:@denoburner/cli"
  }
}
`;

const GITIGNORE_CONTENT = `deno.lock
dist/
.vscode/
.DS_Store
NetscriptDefinitions.d.ts
`;

const MAIN_TS_CONTENT = `export async function main(ns: NS): Promise<void> {
  ns.tprint("Hello from denoburner!");
}
`;

const HELPERS_TS_CONTENT = `export function formatMoney(n: number): string {
  return "$" + n.toLocaleString();
}

export function formatRam(gb: number): string {
  return gb.toFixed(2) + " GB";
}
`;

export default defineCommand({
  meta: {
    name: "init",
    description: "Scaffold a new denoburner project",
  },
  args: {
    dir: { type: "string", default: ".", description: "Target directory" },
  },
  async run({ args }) {
    const dir = resolve(args.dir);

    const files: Record<string, string> = {
      "denoburner.config.ts": CONFIG_CONTENT,
      "deno.json": DENO_JSON_CONTENT,
      "src/home/main.ts": MAIN_TS_CONTENT,
      "src/lib/helpers.ts": HELPERS_TS_CONTENT,
      ".gitignore": GITIGNORE_CONTENT,
    };

    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = join(dir, filePath);
      await ensureDir(dirname(fullPath));
      await Deno.writeTextFile(fullPath, content);
      console.log(`  Created: ${filePath}`);
    }

    const { errors, warnings } = validateConfig({
      sources: [{ dir: "src" }],
    });
    if (warnings.length > 0) {
      for (const w of warnings) console.log(`  warning: ${w}`);
    }
    if (errors.length > 0) {
      console.log("  Config validation failed (this should not happen):");
      for (const e of errors) console.log(`    - ${e}`);
    }

    console.log(`\nDone! Run: denoburner dev`);
  },
});
