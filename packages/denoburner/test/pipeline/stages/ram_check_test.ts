import { assertEquals } from "@std/assert";
import { RamCheckStage } from "../../../src/pipeline/stages/ram_check.ts";
import { RpcCommandExecutor } from "../../../src/rpc/command.ts";
import type { IRpcClient } from "../../../src/rpc/client.ts";
import type { PipelineContext } from "../../../src/pipeline/types.ts";
import type { ILogger } from "../../src/logger/interfaces.ts";

const logger = { info() {}, success() {}, warn() {}, error() {}, child() { return this; } } as unknown as ILogger;

function makeExecutor(client: IRpcClient): RpcCommandExecutor {
  return new RpcCommandExecutor(client, logger, 0);
}

Deno.test("RamCheckStage — calls calculateRam and sets ramCost", async () => {
  const mockClient: IRpcClient = {
    sendRequest: () => Promise.resolve({ ram: 1.75 }),
  };

  const stage = new RamCheckStage(makeExecutor(mockClient));
  const ctx: PipelineContext = {
    localPath: "/project/src/hack.ts",
    gameServer: "home",
    gameFilename: "hack.ts",
    rawContent: "export async function main(ns) {}",
    startedAt: Date.now(),
  };

  await stage.execute(ctx);
  assertEquals(ctx.ramCost, 1.75);
});

Deno.test("RamCheckStage — handles RPC failure gracefully", async () => {
  const mockClient: IRpcClient = {
    sendRequest: () => Promise.reject(new Error("Not connected")),
  };

  const stage = new RamCheckStage(makeExecutor(mockClient));
  const ctx: PipelineContext = {
    localPath: "/project/src/hack.ts",
    gameServer: "home",
    gameFilename: "hack.ts",
    startedAt: Date.now(),
  };

  await stage.execute(ctx);
  assertEquals(ctx.ramCost, 0);
});

Deno.test("RamCheckStage — throws without gameFilename", async () => {
  const mockClient: IRpcClient = {
    sendRequest: () => Promise.resolve({ ram: 0 }),
  };

  const stage = new RamCheckStage(makeExecutor(mockClient));
  const ctx: PipelineContext = {
    localPath: "/project/src/hack.ts",
    gameServer: "home",
    gameFilename: "",
    startedAt: Date.now(),
  };

  let threw = false;
  try {
    await stage.execute(ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
