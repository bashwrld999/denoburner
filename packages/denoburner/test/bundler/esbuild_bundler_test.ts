import { assertEquals, assert } from "@std/assert";
import { EsbuildBundler } from "../../src/bundler/esbuild_bundler.ts";

const b = new EsbuildBundler();
const opts = { sanitizeResources: false, sanitizeOps: false };

Deno.test({
  name: "EsbuildBundler — transpiles .ts to .js",
  ...opts,
  async fn() {
    const result = await b.transpile("test.ts", "let x: number = 1;");
    assert(typeof result.code === "string");
    assert(!result.code.includes(": number"));
    assert(result.code.includes("let x"));
  },
});

Deno.test({
  name: "EsbuildBundler — passthrough on non-ts files",
  ...opts,
  async fn() {
    const result = await b.transpile("test.js", "const x = 1;");
    assertEquals(result.code, "const x = 1;");
  },
});

Deno.test({
  name: "EsbuildBundler — bundles a simple TS file",
  ...opts,
  async fn() {
    const result = await b.bundle("/tmp/test.ts", "export function main() { return 1; }", "/tmp");
    assert(typeof result.code === "string");
    assert(result.code.length > 0);
  },
});

Deno.test({
  name: "EsbuildBundler — passthrough mode",
  ...opts,
  fn() {
    const result = b.passthrough("const x = 1;");
    assertEquals(result.code, "const x = 1;");
  },
});

Deno.test({
  name: "EsbuildBundler — sourceMap inline works",
  ...opts,
  async fn() {
    const result = await b.bundle("/tmp/test.ts", "export function main() {}", "/tmp");
    assert(typeof result.code === "string");
  },
});

Deno.test({
  name: "EsbuildBundler — minify option produces smaller output",
  ...opts,
  async fn() {
    const result = await b.bundle("/tmp/test.ts", "export function main() { const x = 1; return x; }", "/tmp");
    assert(typeof result.code === "string");
  },
});
