import { assertEquals } from "@std/assert";
import { NotifyStage } from "../../../src/pipeline/stages/notify.ts";
import type { ITuiEventBus, TuiEvent } from "../../../src/tui/interfaces.ts";
import type { PipelineContext } from "../../../src/pipeline/types.ts";

class MockEventBus implements ITuiEventBus {
  events: TuiEvent[] = [];
  private handlers: Set<(event: TuiEvent) => void> = new Set();

  emit(event: TuiEvent): void {
    this.events.push(event);
    for (const h of this.handlers) h(event);
  }

  on(handler: (event: TuiEvent) => void): void {
    this.handlers.add(handler);
  }

  off(handler: (event: TuiEvent) => void): void {
    this.handlers.delete(handler);
  }
}

Deno.test("NotifyStage — emits file_uploaded on success", async () => {
  const bus = new MockEventBus();
  const stage = new NotifyStage(bus);

  const ctx: PipelineContext = {
    localPath: "/src/hack.ts",
    gameServer: "home",
    gameFilename: "hack.ts",
    ramCost: 1.75,
    startedAt: Date.now() - 500,
    finishedAt: Date.now(),
  };

  await stage.execute(ctx);
  assertEquals(bus.events.length, 1);
  const event = bus.events[0] as Extract<TuiEvent, { type: "file_uploaded" }>;
  assertEquals(event.type, "file_uploaded");
  assertEquals(event.filename, "hack.ts");
  assertEquals(event.server, "home");
  assertEquals(event.ram, 1.75);
  assertEquals(typeof event.durationMs, "number");
});

Deno.test("NotifyStage — emits file_error when ctx has error", async () => {
  const bus = new MockEventBus();
  const stage = new NotifyStage(bus);

  const ctx: PipelineContext = {
    localPath: "/src/hack.ts",
    gameServer: "home",
    gameFilename: "hack.ts",
    error: new Error("Bundle failed"),
    startedAt: Date.now(),
  };

  await stage.execute(ctx);
  assertEquals(bus.events.length, 1);
  const event = bus.events[0] as Extract<TuiEvent, { type: "file_error" }>;
  assertEquals(event.type, "file_error");
  assertEquals(event.error, "Bundle failed");
});

Deno.test("NotifyStage — emits file_skipped when ctx is skipped", async () => {
  const bus = new MockEventBus();
  const stage = new NotifyStage(bus);

  const ctx: PipelineContext = {
    localPath: "/src/ignored.txt",
    gameServer: "home",
    gameFilename: "ignored.txt",
    skipped: true,
    skipReason: "not a watchable file",
    startedAt: Date.now(),
  };

  await stage.execute(ctx);
  assertEquals(bus.events.length, 1);
  const event = bus.events[0] as Extract<TuiEvent, { type: "file_skipped" }>;
  assertEquals(event.type, "file_skipped");
  assertEquals(event.reason, "not a watchable file");
});
