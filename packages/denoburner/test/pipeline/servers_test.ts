import { assertEquals, assert } from "@std/assert";
import { resolveSourcePath, resolveSourceServerRoot } from "../../src/pipeline/source-mapper.ts";
import type { SourceEntry } from "../../src/config/types.ts";

const sources: SourceEntry[] = [{ dir: "/project/src" }];

Deno.test("resolveSourcePath — detects server from path", () => {
  const r = resolveSourcePath("/project/src/home/hack.ts", sources, "/project", "home");
  assert(r !== null);
  assertEquals(r.server, "home");
  assertEquals(r.filename, "hack.ts");
  assertEquals(r.mode, "bundle");
});

Deno.test("resolveSourcePath — nested files", () => {
  const r = resolveSourcePath("/project/src/n00dles/early/scan.ts", sources, "/project", "home");
  assert(r !== null);
  assertEquals(r.server, "n00dles");
  assertEquals(r.filename, "early/scan.ts");
});

Deno.test("resolveSourcePath — returns null for paths outside sources", () => {
  const r = resolveSourcePath("/project/lib/utils.ts", sources, "/project", "home");
  assertEquals(r, null);
});

Deno.test("resolveSourcePath — custom source directory", () => {
  const customSources: SourceEntry[] = [{ dir: "/project/custom/servers" }];
  const r = resolveSourcePath("/project/custom/servers/foo/bar.ts", customSources, "/project", "home");
  assert(r !== null);
  assertEquals(r.server, "foo");
  assertEquals(r.filename, "bar.ts");
});

Deno.test("resolveSourcePath — files at source root use defaultServer", () => {
  const r = resolveSourcePath("/project/src/lib.ts", sources, "/project", "home");
  assert(r !== null);
  assertEquals(r.server, "home");
  assertEquals(r.filename, "lib.ts");
});

Deno.test("resolveSourcePath — source with server override", () => {
  const overrideSources: SourceEntry[] = [{ dir: "/project/src", server: "foodnstuff" }];
  const r = resolveSourcePath("/project/src/home/hack.ts", overrideSources, "/project", "home");
  assert(r !== null);
  assertEquals(r.server, "foodnstuff");
  assertEquals(r.filename, "home/hack.ts");
});

Deno.test("resolveSourcePath — auto-detects mode from extension", () => {
  const txt = resolveSourcePath("/project/src/home/data.txt", sources, "/project", "home");
  assert(txt !== null);
  assertEquals(txt.mode, "passthrough");

  const tsx = resolveSourcePath("/project/src/home/component.tsx", sources, "/project", "home");
  assert(tsx !== null);
  assertEquals(tsx.mode, "bundle");

  const js = resolveSourcePath("/project/src/home/script.js", sources, "/project", "home");
  assert(js !== null);
  assertEquals(js.mode, "bundle");
});

Deno.test("resolveSourcePath — source mode overrides auto-detect", () => {
  const fixedSources: SourceEntry[] = [{ dir: "/project/src", mode: "transpile" }];
  const r = resolveSourcePath("/project/src/home/main.ts", fixedSources, "/project", "home");
  assert(r !== null);
  assertEquals(r.mode, "transpile");

  const txt = resolveSourcePath("/project/src/home/data.txt", fixedSources, "/project", "home");
  assert(txt !== null);
  assertEquals(txt.mode, "transpile");
});

Deno.test("resolveSourceServerRoot — returns server root directory", () => {
  const r = resolveSourceServerRoot("/project/src/home/hack.ts", sources, "/project");
  assertEquals(r, "/project/src/home");
});

Deno.test("resolveSourceServerRoot — returns null when no subdirectory", () => {
  const r = resolveSourceServerRoot("/project/src/lib.ts", sources, "/project");
  assertEquals(r, null);
});

Deno.test("resolveSourceServerRoot — null for paths outside sources", () => {
  const r = resolveSourceServerRoot("/project/lib/utils.ts", sources, "/project");
  assertEquals(r, null);
});
