import { assertEquals, assert } from "@std/assert";
import { validateConfig, defineConfig } from "../../src/config/loader.ts";
import type { DenoburnerConfig } from "../../src/config/types.ts";

Deno.test("validateConfig — accepts valid config", () => {
  const config: DenoburnerConfig = {
    defaultServer: "home",
    port: 12525,
    host: "localhost",
    watch: [{ pattern: "**/*.ts", mode: "bundle" }],
  };
  const { errors } = validateConfig(config);
  assertEquals(errors.length, 0);
});

Deno.test("validateConfig — rejects empty defaultServer", () => {
  const { errors } = validateConfig({
    defaultServer: "",
    port: 12525,
    host: "localhost",
    watch: [{ pattern: "**/*.ts", mode: "bundle" }],
  });
  assert(errors.some((e) => e.includes("defaultServer")), "should complain about empty defaultServer");
});

Deno.test("validateConfig — rejects port out of range", () => {
  const { errors } = validateConfig({
    defaultServer: "home",
    port: 99999,
    host: "localhost",
    watch: [{ pattern: "**/*.ts", mode: "bundle" }],
  });
  assert(errors.some((e) => e.includes("port")));
});

Deno.test("validateConfig — rejects empty watch", () => {
  const { errors } = validateConfig({
    defaultServer: "home",
    port: 12525,
    host: "localhost",
    watch: [],
  });
  assert(errors.some((e) => e.includes("watch")));
});

Deno.test("validateConfig — rejects invalid mode", () => {
  const { errors } = validateConfig({
    defaultServer: "home",
    port: 12525,
    host: "localhost",
    watch: [{ pattern: "**/*.ts", mode: "invalid" as never }],
  });
  assert(errors.some((e) => e.includes("invalid")));
});

Deno.test("validateConfig — rejects watch entry missing pattern", () => {
  const { errors } = validateConfig({
    defaultServer: "home",
    port: 12525,
    host: "localhost",
    watch: [{ pattern: "", mode: "bundle" }],
  });
  assert(errors.some((e) => e.includes("pattern")));
});

Deno.test("validateConfig — rejects empty host", () => {
  const { errors } = validateConfig({
    defaultServer: "home",
    port: 12525,
    host: "",
    watch: [{ pattern: "**/*.ts", mode: "bundle" }],
  });
  assert(errors.some((e) => e.includes("host")));
});

Deno.test("defineConfig — merges with defaults", () => {
  const config = defineConfig({ defaultServer: "n00dles" });
  assertEquals(config.defaultServer, "n00dles");
  assertEquals(config.port, 12525);
  assertEquals(config.host, "localhost");
  assertEquals(config.watch.length, 2); // defaults applied
});

Deno.test("defineConfig — preserves watch override", () => {
  const config = defineConfig({
    watch: [{ pattern: "*.ts", mode: "transpile" }],
  });
  assertEquals(config.watch.length, 1);
  assertEquals(config.watch[0].mode, "transpile");
});

Deno.test("validateConfig — returns all errors at once", () => {
  const { errors } = validateConfig({
    defaultServer: "",
    port: 0,
    host: "",
    watch: [],
  });
  assert(errors.length >= 3, "should return multiple errors");
});
