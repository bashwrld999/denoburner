import { assertEquals } from "@std/assert";
import { DependencyGraph } from "../../src/watcher/dependency-graph.ts";

Deno.test("DependencyGraph — tracks dependencies", () => {
  const g = new DependencyGraph();
  g.update("src/servers/home/a.ts", ["./b.ts"], "home");
  g.update("src/servers/home/b.ts", [], "home");

  assertEquals(g.getDependencies("src/servers/home/a.ts"), ["src/servers/home/b.ts"]);
  assertEquals(g.getDependents("src/servers/home/b.ts"), ["src/servers/home/a.ts"]);
});

Deno.test("DependencyGraph — getAffectedFiles finds dependents", () => {
  const g = new DependencyGraph();
  g.update("a.ts", ["./b.ts"]);
  g.update("b.ts", []);
  g.update("c.ts", ["./a.ts"]);

  const r = g.getAffectedFiles("b.ts");
  assertEquals(r.affectedFiles.includes("b.ts"), true);
  assertEquals(r.affectedFiles.includes("a.ts"), true);
  assertEquals(r.affectedFiles.includes("c.ts"), true);
});

Deno.test("DependencyGraph — no cycles in simple case", () => {
  const g = new DependencyGraph();
  g.update("a.ts", []);
  assertEquals(g.getAffectedFiles("a.ts").affectedFiles, ["a.ts"]);
});

Deno.test("DependencyGraph — clear removes all", () => {
  const g = new DependencyGraph();
  g.update("a.ts", []);
  g.clear();
  assertEquals(g.getAllFiles().length, 0);
});

Deno.test("DependencyGraph — remove cleans up references", () => {
  const g = new DependencyGraph();
  g.update("a.ts", ["./b.ts"]);
  g.update("b.ts", []);
  g.remove("b.ts");
  assertEquals(g.getDependencies("a.ts").length, 0);
});

Deno.test("DependencyGraph — skips external deps", () => {
  const g = new DependencyGraph();
  g.update("a.ts", ["npm:react", "jsr:@std/assert", "https://deno.land/x/mod.ts"]);
  assertEquals(g.getDependencies("a.ts").length, 0);
});
