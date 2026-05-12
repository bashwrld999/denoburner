import { assertEquals } from "@std/assert";
import { DependencyGraph } from "../../src/watcher/dependency-graph.ts";

Deno.test("Cascade — single level dependency", () => {
  const g = new DependencyGraph();
  g.update("src/servers/home/main.ts", ["src/servers/home/lib.ts"]);
  g.update("src/servers/home/lib.ts", []);
  const r = g.getAffectedFiles("src/servers/home/lib.ts");
  assertEquals(r.affectedFiles.includes("src/servers/home/lib.ts"), true);
  assertEquals(r.affectedFiles.includes("src/servers/home/main.ts"), true);
});

Deno.test("Cascade — deep chain propagates", () => {
  const g = new DependencyGraph(10);
  g.update("a.ts", ["./b.ts"]);
  g.update("b.ts", ["./c.ts"]);
  g.update("c.ts", []);
  const r = g.getAffectedFiles("c.ts");
  assertEquals(r.affectedFiles, ["c.ts", "b.ts", "a.ts"]);
});

Deno.test("Cascade — respects maxDepth", () => {
  const g = new DependencyGraph(1);
  g.update("a.ts", ["./b.ts"]);
  g.update("b.ts", ["./c.ts"]);
  g.update("c.ts", []);
  const r = g.getAffectedFiles("c.ts");
  assertEquals(r.affectedFiles, ["c.ts", "b.ts"]);
  assertEquals(r.affectedFiles.includes("a.ts"), false);
});

Deno.test("Cascade — external deps are ignored", () => {
  const g = new DependencyGraph();
  g.update("a.ts", ["npm:react", "jsr:@std/assert"]);
  assertEquals(g.getDependencies("a.ts").length, 0);
});

Deno.test("Cascade — relative path resolution", () => {
  const g = new DependencyGraph();
  g.update(
    "/project/src/servers/home/main.ts",
    ["/project/src/servers/home/lib.ts"],
  );
  g.update("/project/src/servers/home/lib.ts", []);
  const r = g.getAffectedFiles("/project/src/servers/home/lib.ts");
  assertEquals(r.affectedFiles.includes("/project/src/servers/home/lib.ts"), true);
  assertEquals(r.affectedFiles.includes("/project/src/servers/home/main.ts"), true);
});

Deno.test("Cascade — update recomputes dependents", () => {
  const g = new DependencyGraph();
  g.update("a.ts", ["./b.ts"]);
  g.update("b.ts", []);
  // a.ts no longer depends on b.ts
  g.update("a.ts", []);
  const r = g.getAffectedFiles("b.ts");
  assertEquals(r.affectedFiles.length, 1);
  assertEquals(r.affectedFiles[0], "b.ts");
});
