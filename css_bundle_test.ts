import { EsbuildBundler } from "./packages/denoburner/src/bundler/esbuild_bundler.ts";

const tmp = await Deno.makeTempDir({ prefix: "css-test-" });
await Deno.writeTextFile(tmp + "/test.css", "#test { color: blue; }");
const code = `import './test.css';\nexport function main(ns: NS) { ns.tprint("hi"); }`;

const bundler = new EsbuildBundler({ minify: false });
console.log("Bundling...");
const result = await bundler.bundle(tmp + "/test.tsx", code, tmp);
console.log("=== OUTPUT (last 300 chars) ===");
console.log(result.code.slice(-300));
console.log("=== END ===");
console.log("CSS bundled:", result.code.includes("blue"));
await bundler.close!();
await Deno.remove(tmp, { recursive: true });
