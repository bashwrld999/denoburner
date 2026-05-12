import { assertEquals } from "@std/assert";
import { RpcClient } from "../../src/rpc/client.ts";
import { PendingRequestMap } from "../../src/rpc/pending_requests.ts";
import type { IMessageSender } from "../../src/rpc/types.ts";
import type { ILogger } from "../../src/logger/interfaces.ts";

const logger = { info() {}, success() {}, warn() {}, error() {}, child() { return this; } } as unknown as ILogger;

Deno.test("RpcClient — sends JSON-RPC request and returns result", async () => {
  let sentMessage = "";
  const sender: IMessageSender = {
    send: (msg: string) => { sentMessage = msg; },
  };

  const pending = new PendingRequestMap();
  const client = new RpcClient(sender, pending, logger);

  // Start the request
  const promise = client.sendRequest<{ success: true }>("pushFile", {
    filename: "test.ts",
    content: "// code",
    server: "home",
  });

  // The request should have been sent
  const request = JSON.parse(sentMessage);
  assertEquals(request.jsonrpc, "2.0");
  assertEquals(request.method, "pushFile");
  assertEquals(request.params.filename, "test.ts");

  // Resolve the pending request
  pending.resolve(request.id, { success: true });

  const result = await promise;
  assertEquals(result, { success: true });
});

Deno.test("RpcClient — rejects on timeout", async () => {
  const sender: IMessageSender = {
    send: (_msg: string) => {},
  };

  const pending = new PendingRequestMap(100); // 100ms timeout
  const client = new RpcClient(sender, pending, logger);

  let threw = false;
  try {
    await client.sendRequest("slowMethod");
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message.includes("timed out"), true);
  }
  assertEquals(threw, true);
});
