import { assertEquals, assert } from "@std/assert";
import { validateConfig, defineConfig } from "../../src/config/loader.ts";
import type { DenoburnerConfig } from "../../src/config/types.ts";

Deno.test("validateConfig — accepts valid config", () => {
  const config: DenoburnerConfig = {
    defaultServer: "home",
    port: 12525,
    host: "localhost",
    sources: [{ dir: "src" }],
  };
  const { errors } = validateConfig(config);
  assertEquals(errors.length, 0);
});

Deno.test("validateConfig — rejects empty defaultServer", () => {
  const { errors } = validateConfig({
    defaultServer: "",
    port: 12525,
    host: "localhost",
    sources: [{ dir: "src" }],
  } as DenoburnerConfig);
  assert(errors.some((e) => e.includes("defaultServer")), "should complain about empty defaultServer");
});

Deno.test("validateConfig — rejects port out of range", () => {
  const { errors } = validateConfig({
    defaultServer: "home",
    port: 99999,
    host: "localhost",
    sources: [{ dir: "src" }],
  } as DenoburnerConfig);
  assert(errors.some((e) => e.includes("port")));
});

Deno.test("validateConfig — rejects empty sources", () => {
  const { errors } = validateConfig({
    defaultServer: "home",
    port: 12525,
    host: "localhost",
    sources: [],
  } as DenoburnerConfig);
  assert(errors.some((e) => e.includes("source")));
});

Deno.test("validateConfig — rejects invalid mode", () => {
  const { errors } = validateConfig({
    defaultServer: "home",
    port: 12525,
    host: "localhost",
    sources: [{ dir: "src", mode: "invalid" as never }],
  } as DenoburnerConfig);
  assert(errors.some((e) => e.includes("invalid")));
});

Deno.test("validateConfig — rejects source entry missing dir", () => {
  const { errors } = validateConfig({
    defaultServer: "home",
    port: 12525,
    host: "localhost",
    sources: [{ dir: "" }],
  } as DenoburnerConfig);
  assert(errors.some((e) => e.includes("dir")));
});

Deno.test("validateConfig — rejects empty host", () => {
  const { errors } = validateConfig({
    defaultServer: "home",
    port: 12525,
    host: "",
    sources: [{ dir: "src" }],
  } as DenoburnerConfig);
  assert(errors.some((e) => e.includes("host")));
});

Deno.test("defineConfig — merges with defaults", () => {
  const config = defineConfig({ defaultServer: "n00dles" });
  assertEquals(config.defaultServer, "n00dles");
  assertEquals(config.port, 12525);
  assertEquals(config.host, "localhost");
  assertEquals(config.sources?.length, 1);
  assertEquals(config.sources?.[0].dir, "src");
});

Deno.test("defineConfig — preserves sources override", () => {
  const config = defineConfig({
    sources: [{ dir: "custom", mode: "transpile" }],
  });
  assertEquals(config.sources?.length, 1);
  assertEquals(config.sources?.[0].mode, "transpile");
});

Deno.test("validateConfig — returns all errors at once", () => {
  const { errors } = validateConfig({
    defaultServer: "",
    port: 0,
    host: "",
    sources: [],
  } as DenoburnerConfig);
  assert(errors.length >= 3, "should return multiple errors");
});
