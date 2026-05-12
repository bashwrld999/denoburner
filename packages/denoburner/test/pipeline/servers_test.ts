import { assertEquals, assert } from "@std/assert";
import { parseServerPath, resolveServerRoot } from "../../src/pipeline/servers.ts";

Deno.test("parseServerPath — detects server from path", () => {
  const r = parseServerPath("/project/src/servers/home/hack.ts");
  assert(r !== null);
  assertEquals(r.server, "home");
  assertEquals(r.relativePath, "hack.ts");
});

Deno.test("parseServerPath — nested files", () => {
  const r = parseServerPath("/project/src/servers/n00dles/early/scan.ts");
  assert(r !== null);
  assertEquals(r.server, "n00dles");
  assertEquals(r.relativePath, "early/scan.ts");
});

Deno.test("parseServerPath — returns null for non-server paths", () => {
  const r = parseServerPath("/project/src/lib/utils.ts");
  assertEquals(r, null);
});

Deno.test("parseServerPath — custom serversDir", () => {
  const r = parseServerPath("/project/servers/home/main.ts", "servers");
  assert(r !== null);
  assertEquals(r.server, "home");
});

Deno.test("parseServerPath — custom nested serversDir", () => {
  const r = parseServerPath("/project/custom/servers/foo/bar.ts", "custom/servers");
  assert(r !== null);
  assertEquals(r.server, "foo");
  assertEquals(r.relativePath, "bar.ts");
});

Deno.test("parseServerPath — handles Windows paths", () => {
  const r = parseServerPath("C:\\project\\src\\servers\\home\\hack.ts");
  assert(r !== null);
  assertEquals(r.server, "home");
});

Deno.test("resolveServerRoot — returns server root directory", () => {
  const r = resolveServerRoot("/project/src/servers/home/hack.ts");
  assertEquals(r, "/project/src/servers/home");
});

Deno.test("resolveServerRoot — null for non-server paths", () => {
  const r = resolveServerRoot("/project/src/lib/utils.ts");
  assertEquals(r, null);
});
