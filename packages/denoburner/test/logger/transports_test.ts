import { assertEquals } from "@std/assert";
import { ConsoleTransport } from "../../src/logger/console_transport.ts";
import { TuiTransport } from "../../src/logger/tui_transport.ts";
import type { LogEntry } from "../../src/tui/interfaces.ts";

Deno.test("ConsoleTransport — does not throw when disabled", () => {
  const t = new ConsoleTransport(false);
  const entry: LogEntry = { timestamp: new Date(), level: "info", message: "test" };
  t.log(entry); // should not throw
});

Deno.test("TuiTransport — calls appendLog callback", () => {
  let received: LogEntry | null = null;
  const t = new TuiTransport((e) => { received = e; });
  const entry: LogEntry = { timestamp: new Date(), level: "success", message: "hello" };
  t.log(entry);
  assertEquals(received, entry);
});

Deno.test("TuiTransport — multiple entries in order", () => {
  const entries: LogEntry[] = [];
  const t = new TuiTransport((e) => { entries.push(e); });
  t.log({ timestamp: new Date(), level: "info", message: "a" });
  t.log({ timestamp: new Date(), level: "warn", message: "b" });
  assertEquals(entries.length, 2);
  assertEquals(entries[0].message, "a");
  assertEquals(entries[1].message, "b");
});
