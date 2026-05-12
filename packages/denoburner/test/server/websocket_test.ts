import { assertEquals } from "@std/assert";
import { WebSocketServer } from "../../src/server/websocket_server.ts";
import { WsClient } from "../../src/server/ws_client.ts";
import type { ILogger } from "../../src/logger/interfaces.ts";
import type { IClientConnection } from "../../src/server/interfaces.ts";

function getPort(): number {
  return 19000 + Math.floor(Math.random() * 5000);
}

Deno.test("WebSocket — server starts and stops", async () => {
  const server = new WebSocketServer({ host: "localhost", port: getPort(), logger: { info() {}, success() {}, warn() {}, error() {}, child() { return this; } } as unknown as ILogger });
  await server.start();
  await server.stop();
});

Deno.test("WebSocket — client can connect and disconnect", async () => {
  const port = getPort();
  const server = new WebSocketServer({ host: "localhost", port, logger: { info() {}, success() {}, warn() {}, error() {}, child() { return this; } } as unknown as ILogger });
  await server.start();

  let connected = false;
  server.onConnection((_client: IClientConnection) => { connected = true; });

  const client = new WsClient({ info() {}, success() {}, warn() {}, error() {}, child() { return this; } } as unknown as ILogger);
  await client.connect(`ws://localhost:${port}`);

  // Wait for async connection to be established
  await new Promise((r) => setTimeout(r, 200));
  assertEquals(connected, true);

  client.close();
  await server.stop();
});

Deno.test("WebSocket — message exchange works", async () => {
  const port = getPort();
  const server = new WebSocketServer({ host: "localhost", port, logger: { info() {}, success() {}, warn() {}, error() {}, child() { return this; } } as unknown as ILogger });
  await server.start();

  let received: string | null = null;
  server.onConnection((_client: IClientConnection) => {
    server.onMessage((data: string) => { received = data; });
  });

  const client = new WsClient({ info() {}, success() {}, warn() {}, error() {}, child() { return this; } } as unknown as ILogger);
  await client.connect(`ws://localhost:${port}`);
  await new Promise((r) => setTimeout(r, 100));

  client.send("hello server");
  await new Promise((r) => setTimeout(r, 100));
  assertEquals(received, "hello server");

  client.close();
  await server.stop();
});
