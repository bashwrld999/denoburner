/**
 * Build command
 * 
 * Builds all files and saves them to the output directory.
 */

import { defineCommand } from "citty";
import { loadConfig } from "../../config/index.ts";
import { createBundler } from "../../bundler/index.ts";
import { join, dirname } from "jsr:@std/path";

/**
 * Ensure directory exists
 */
async function ensureDir(path: string): Promise<void> {
  try {
    await Deno.mkdir(path, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }
}

export default defineCommand({
  meta: {
    name: "build",
    description: "Builds all files and saves them to the output directory.",
  },
  args: {
    outDir: {
      type: "string",
      description: "Output directory",
      alias: "o",
    },
  },
  async run({ args }) {
    // Load configuration
    const config = await loadConfig();
    const outDir = args.outDir ?? config.outDir;

    console.log(`Building to ${outDir}/...`);

    const bundler = createBundler({
      sourceMap: config.sourceMap,
      minify: config.minify,
    });

    let totalFiles = 0;
    let totalRam = 0;

    // Process each watch item
    for (const item of config.watch) {
      const files = await getMatchingFiles(item.pattern);

      for (const file of files) {
        try {
          const locations = item.location(file);

          for (const { filename, server } of locations) {
            const processed = await bundler.processFile(file, item.bundle, server);

            // Determine output path
            const outputPath = join(outDir, server, processed.filename);
            await ensureDir(dirname(outputPath));

            // Write file
            await Deno.writeTextFile(outputPath, processed.content);

            // Write source map if present
            if (processed.sourceMap) {
              await Deno.writeTextFile(`${outputPath}.map`, processed.sourceMap);
            }

            const bundleStr = processed.bundled ? ` (bundled: ${processed.bundledDeps} deps)` : "";
            console.log(`✓ Built: ${server}/${processed.filename}${bundleStr}`);
            totalFiles++;
          }
        } catch (error) {
          console.error(`✗ Failed to build ${file}: ${error}`);
        }
      }
    }

    console.log(`Build complete: ${totalFiles} files written to ${outDir}/`);
  },
});

/**
 * Get all files matching a glob pattern
 */
async function getMatchingFiles(pattern: string): Promise<string[]> {
  const files: string[] = [];
  const baseDir = pattern.split(/[*?{]/)[0].replace(/\/+$/, "") || ".";

  try {
    for await (const entry of walkDir(baseDir, pattern)) {
      files.push(entry);
    }
  } catch {
    // Directory doesn't exist
  }

  return files;
}

/**
 * Walk directory and yield files matching pattern
 */
async function* walkDir(dir: string, pattern: string): AsyncGenerator<string> {
  const { globToRegExp } = await import("jsr:@std/path/posix");
  const regex = globToRegExp(pattern, { extended: true, globstar: true });
  const cwd = Deno.cwd();

  async function* walk(currentDir: string): AsyncGenerator<string> {
    try {
      for await (const entry of Deno.readDir(currentDir)) {
        const path = `${currentDir}/${entry.name}`;

        if (entry.isDirectory) {
          yield* walk(path);
        } else if (entry.isFile) {
          const relativePath = path.replace(`${cwd}/`, "");
          if (regex.test(relativePath)) {
            yield relativePath;
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }

  yield* walk(dir);
}
