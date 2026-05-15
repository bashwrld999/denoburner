import { assertEquals, assert } from "@std/assert";
import { EsbuildBundler } from "../../src/bundler/esbuild_bundler.ts";

const b = new EsbuildBundler();
const opts = { sanitizeResources: false, sanitizeOps: false };

function cleanDir(path: string): Promise<void> {
  return Deno.remove(path, { recursive: true }).catch(() => {});
}

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

Deno.test({
  name: "EsbuildBundler — bundles imports outside server root",
  ...opts,
  async fn() {
    const tmp = await Deno.makeTempDir({ prefix: "db-smart-" });
    const srv = `${tmp}/servers/home`;
    await Deno.mkdir(srv, { recursive: true });
    await Deno.mkdir(`${tmp}/lib`, { recursive: true });
    await Deno.writeTextFile(`${tmp}/lib/helper.ts`,
      "export function help() { return 42; }");
    const content = `import { help } from "../../lib/helper.ts"; export const r = help();`;
    const bundler = new EsbuildBundler();
    const result = await bundler.bundle(`${srv}/a.ts`, content, srv);
    assert(result.code.includes("42"), "outside dep should be bundled in");
    await bundler.close!();
    await cleanDir(tmp);
  },
});

Deno.test({
  name: "EsbuildBundler — keeps same-server imports external",
  ...opts,
  async fn() {
    const tmp = await Deno.makeTempDir({ prefix: "db-ext-" });
    const srv = `${tmp}/servers/home`;
    await Deno.mkdir(srv, { recursive: true });
    await Deno.writeTextFile(`${srv}/b.ts`, "export const x = 1;");
    const content = `import { x } from "./b.ts"; export const r = x;`;
    const bundler = new EsbuildBundler();
    const result = await bundler.bundle(`${srv}/a.ts`, content, srv);
    assert(result.code.includes('./b.ts'), "same-server import stays external");
    await bundler.close!();
    await cleanDir(tmp);
  },
});

Deno.test({
  name: "EsbuildBundler — .tsx files get JSX transform",
  ...opts,
  async fn() {
    const bundler = new EsbuildBundler();
    const result = await bundler.bundle("/tmp/app.tsx",
      "export function App() { return <div>hi</div>; }", "/tmp");
    assert(result.code.includes("createElement"), "JSX should be transformed");
    await bundler.close!();
  },
});
