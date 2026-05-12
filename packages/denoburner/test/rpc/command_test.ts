import { assertEquals, assert } from "@std/assert";
import { RpcCommandExecutor } from "../../src/rpc/command.ts";
import { PushFileCommand } from "../../src/rpc/commands/push_file_command.ts";
import { CalculateRamCommand } from "../../src/rpc/commands/calculate_ram_command.ts";
import type { IRpcClient } from "../../src/rpc/client.ts";
import type { ILogger } from "../../src/logger/interfaces.ts";

const logger = { info() {}, success() {}, warn() {}, error() {}, child() { return this; } } as unknown as ILogger;

Deno.test("PushFileCommand — formats params correctly", () => {
  const cmd = new PushFileCommand({
    filename: "hack.ts",
    content: "// code",
    server: "home",
  });
  assertEquals(cmd.method, "pushFile");
  assertEquals(cmd.params, { filename: "hack.ts", content: "// code", server: "home" });
});

Deno.test("PushFileCommand — parses { success: true }", () => {
  const cmd = new PushFileCommand({ filename: "h.ts", content: "", server: "home" });
  const result = cmd.parseResponse({ success: true });
  assertEquals(result.success, true);
});

Deno.test("PushFileCommand — parses boolean true", () => {
  const cmd = new PushFileCommand({ filename: "h.ts", content: "", server: "home" });
  const result = cmd.parseResponse(true);
  assertEquals(result.success, true);
});

Deno.test("PushFileCommand — parses string OK", () => {
  const cmd = new PushFileCommand({ filename: "h.ts", content: "", server: "home" });
  const result = cmd.parseResponse("OK");
  assertEquals(result.success, true);
});

Deno.test("PushFileCommand — throws on invalid response", () => {
  const cmd = new PushFileCommand({ filename: "h.ts", content: "", server: "home" });
  try {
    cmd.parseResponse({ success: false });
    assert(false, "should have thrown");
  } catch (e) {
    assertEquals((e as Error).message.includes("pushFile"), true);
  }
});

Deno.test("CalculateRamCommand — parses { ram: number }", () => {
  const cmd = new CalculateRamCommand({ filename: "h.ts" });
  const result = cmd.parseResponse({ ram: 2.4 });
  assertEquals(result.ram, 2.4);
});

Deno.test("CalculateRamCommand — parses plain number", () => {
  const cmd = new CalculateRamCommand({ filename: "h.ts" });
  const result = cmd.parseResponse(1.75);
  assertEquals(result.ram, 1.75);
});

Deno.test("CalculateRamCommand — formats params correctly", () => {
  const cmd = new CalculateRamCommand({ filename: "hack.ts", server: "home" });
  assertEquals(cmd.method, "calculateRam");
  assertEquals(cmd.params, { filename: "hack.ts", server: "home" });
});

Deno.test("CalculateRamCommand — parses valid response", () => {
  const cmd = new CalculateRamCommand({ filename: "h.ts" });
  const result = cmd.parseResponse({ ram: 2.4 });
  assertEquals(result.ram, 2.4);
});

Deno.test("RpcCommandExecutor — executes command and returns parsed result", async () => {
  const client: IRpcClient = {
    sendRequest: () => Promise.resolve({ success: true }),
  };
  const executor = new RpcCommandExecutor(client, logger, 0);
  const result = await executor.execute(
    new PushFileCommand({ filename: "t.ts", content: "", server: "home" }),
  );
  assertEquals(result.success, true);
});

Deno.test("RpcCommandExecutor — retries on transient failure", async () => {
  let attempts = 0;
  const client: IRpcClient = {
    sendRequest: () => {
      attempts++;
      if (attempts < 3) return Promise.reject(new Error("transient"));
      return Promise.resolve({ ram: 1.0 });
    },
  };

  const executor = new RpcCommandExecutor(client, logger, 3);
  const result = await executor.execute(
    new CalculateRamCommand({ filename: "h.ts" }),
  );
  assertEquals(result.ram, 1.0);
  assertEquals(attempts, 3);
});

Deno.test("RpcCommandExecutor — throws after exhausting retries", async () => {
  const client: IRpcClient = {
    sendRequest: () => Promise.reject(new Error("permanent")),
  };

  const executor = new RpcCommandExecutor(client, logger, 1);
  let threw = false;
  try {
    await executor.execute(new CalculateRamCommand({ filename: "h.ts" }));
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
