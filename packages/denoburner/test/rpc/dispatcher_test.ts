import { assertEquals } from "@std/assert";
import { RpcDispatcher } from "../../src/rpc/dispatcher.ts";
import { PendingRequestMap } from "../../src/rpc/pending_requests.ts";
import type { IMessageSender } from "../../src/rpc/types.ts";
import type { ILogger } from "../../src/logger/interfaces.ts";

class MockSender implements IMessageSender {
  messages: string[] = [];

  send(message: string): void {
    this.messages.push(message);
  }
}

const logger = { info() {}, success() {}, warn() {}, error() {}, child() { return this; } } as unknown as ILogger;

Deno.test("RpcDispatcher — returns error for unknown request method", async () => {
  const pending = new PendingRequestMap();
  const dispatcher = new RpcDispatcher(pending, logger);
  const sender = new MockSender();

  await dispatcher.dispatch(
    JSON.stringify({ jsonrpc: "2.0", id: 5, method: "unknown_method" }),
    sender,
  );

  assertEquals(sender.messages.length, 1);
  const response = JSON.parse(sender.messages[0]);
  assertEquals(response.id, 5);
  assertEquals(response.error.code, -32601);
  assertEquals(response.error.message.includes("unknown_method"), true);
});

Deno.test("RpcDispatcher — returns parse error for invalid JSON", async () => {
  const pending = new PendingRequestMap();
  const dispatcher = new RpcDispatcher(pending, logger);
  const sender = new MockSender();

  await dispatcher.dispatch("not valid json", sender);

  assertEquals(sender.messages.length, 1);
  const response = JSON.parse(sender.messages[0]);
  assertEquals(response.error.code, -32700);
});

Deno.test("RpcDispatcher — resolves pending promise on success response", async () => {
  const pending = new PendingRequestMap();
  const dispatcher = new RpcDispatcher(pending, logger);
  const sender = new MockSender();

  const { id, promise } = pending.add("testMethod");

  await dispatcher.dispatch(
    JSON.stringify({ jsonrpc: "2.0", id, result: { ok: true } }),
    sender,
  );

  const result = await promise;
  assertEquals(result, { ok: true });
});

Deno.test("RpcDispatcher — rejects pending promise on error response", async () => {
  const pending = new PendingRequestMap();
  const dispatcher = new RpcDispatcher(pending, logger);
  const sender = new MockSender();

  const { id, promise } = pending.add("testMethod");

  await dispatcher.dispatch(
    JSON.stringify({ jsonrpc: "2.0", id, error: { code: -1, message: "Something went wrong" } }),
    sender,
  );

  let threw = false;
  try {
    await promise;
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message.includes("Something went wrong"), true);
  }
  assertEquals(threw, true);
});
