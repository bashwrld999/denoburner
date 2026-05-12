import { assertEquals } from "@std/assert";
import { PluginManager } from "../../src/bundler/plugin-manager.ts";

Deno.test("PluginManager — register and get plugins", () => {
  const pm = new PluginManager();
  pm.register({ name: "test", setup: () => {} });
  assertEquals(pm.getPlugins().length, 1);
  assertEquals(pm.getPlugins()[0].name, "test");
});

Deno.test("PluginManager — priority ordering", () => {
  const pm = new PluginManager();
  pm.register({ name: "low", priority: 30, setup: () => {} });
  pm.register({ name: "high", priority: 10, setup: () => {} });
  pm.register({ name: "mid", priority: 20, setup: () => {} });
  assertEquals(pm.getPlugins().map((p) => p.name), ["high", "mid", "low"]);
});

Deno.test("PluginManager — remove", () => {
  const pm = new PluginManager();
  pm.register({ name: "a", setup: () => {} });
  assertEquals(pm.remove("a"), true);
  assertEquals(pm.remove("a"), false);
  assertEquals(pm.getPlugins().length, 0);
});

Deno.test("PluginManager — clear", () => {
  const pm = new PluginManager();
  pm.register({ name: "a", setup: () => {} });
  pm.register({ name: "b", setup: () => {} });
  pm.clear();
  assertEquals(pm.getPlugins().length, 0);
});

Deno.test("PluginManager — hooks run in order", async () => {
  const order: string[] = [];
  const pm = new PluginManager();
  pm.register({
    name: "p1", priority: 10,
    hooks: {
      async beforeBuild() { order.push("p1"); },
      async transformOutput(c) { return c + "-p1"; },
    },
  });
  pm.register({
    name: "p2", priority: 20,
    hooks: {
      async beforeBuild() { order.push("p2"); },
      async transformOutput(c) { return c + "-p2"; },
    },
  });

  await pm.runBeforeBuild("entry.ts");
  assertEquals(order, ["p1", "p2"]);

  const out = await pm.transformOutput("base", "entry.ts");
  assertEquals(out, "base-p1-p2");
});

Deno.test("PluginManager — wrapMain sync only", () => {
  const pm = new PluginManager();
  pm.register({ name: "w1", hooks: { wrapMain(c) { return `/* w1 */\n${c}`; } } });
  const r = pm.wrapMain("export function main(){}");
  assertEquals(r, "/* w1 */\nexport function main(){}");
});
