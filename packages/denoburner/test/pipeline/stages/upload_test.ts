import { assertEquals } from "@std/assert";
import { UploadStage } from "../../../src/pipeline/stages/upload.ts";
import { RpcCommandExecutor } from "../../../src/rpc/command.ts";
import { FileCache } from "../../../src/state/cache.ts";
import { UploadQueueManager } from "../../../src/state/queue.ts";
import type { IRpcClient } from "../../../src/rpc/client.ts";
import type { PipelineContext } from "../../../src/pipeline/types.ts";
import type { ILogger } from "../../src/logger/interfaces.ts";

const logger = { info() {}, success() {}, warn() {}, error() {}, child() { return this; } } as unknown as ILogger;

function makeExecutor(client: IRpcClient): RpcCommandExecutor {
  return new RpcCommandExecutor(client, logger, 0);
}

Deno.test("UploadStage — calls pushFile with correct params", async () => {
  let calledMethod = "";
  let calledParams: unknown = null;

  const mockClient: IRpcClient = {
    sendRequest: (method: string, params?: unknown) => {
      calledMethod = method;
      calledParams = params;
      return Promise.resolve({ success: true });
    },
  };

  const stage = new UploadStage(makeExecutor(mockClient));
  const ctx: PipelineContext = {
    localPath: "/project/src/hack.ts",
    gameServer: "home",
    gameFilename: "hack.ts",
    bundledContent: "export async function main(ns) {}",
    startedAt: Date.now(),
  };

  await stage.execute(ctx);
  assertEquals(calledMethod, "pushFile");
  assertEquals(calledParams, {
    filename: "hack.ts",
    content: "export async function main(ns) {}",
    server: "home",
  });
});

Deno.test("UploadStage — throws without bundledContent", async () => {
  const mockClient: IRpcClient = {
    sendRequest: () => Promise.resolve({ success: true }),
  };

  const stage = new UploadStage(makeExecutor(mockClient));
  const ctx: PipelineContext = {
    localPath: "/project/src/hack.ts",
    gameServer: "home",
    gameFilename: "hack.ts",
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

Deno.test("UploadStage — skips upload when FileCache says unchanged", async () => {
  const cache = new FileCache();
  const tmpFile = await Deno.makeTempFile({ suffix: ".ts" });
  await Deno.writeTextFile(tmpFile, "const x = 1;");

  let uploadCalled = false;
  const mockClient: IRpcClient = {
    sendRequest: () => { uploadCalled = true; return Promise.resolve({ success: true }); },
  };

  // Mark as already uploaded
  await cache.markUploaded(tmpFile, "home", "test.ts", "const x = 1;");

  const stage = new UploadStage(makeExecutor(mockClient), cache);
  const ctx: PipelineContext = {
    localPath: tmpFile,
    gameServer: "home",
    gameFilename: "test.ts",
    bundledContent: "const x = 1;",
    startedAt: Date.now(),
  };

  await stage.execute(ctx);
  assertEquals(uploadCalled, false);
  assertEquals(ctx.skipped, true);
  assertEquals(ctx.skipReason, "File unchanged");

  await Deno.remove(tmpFile);
});

Deno.test("UploadStage — uploads when FileCache says content changed", async () => {
  const cache = new FileCache();
  const tmpFile = await Deno.makeTempFile({ suffix: ".ts" });
  await Deno.writeTextFile(tmpFile, "const x = 1;");

  let uploadCalled = false;
  const mockClient: IRpcClient = {
    sendRequest: () => { uploadCalled = true; return Promise.resolve({ success: true }); },
  };

  // Mark old content as uploaded
  await cache.markUploaded(tmpFile, "home", "test.ts", "const x = 1;");
  // Change file content
  await Deno.writeTextFile(tmpFile, "const x = 2;");

  const stage = new UploadStage(makeExecutor(mockClient), cache);
  const ctx: PipelineContext = {
    localPath: tmpFile,
    gameServer: "home",
    gameFilename: "test.ts",
    bundledContent: "const x = 2;",
    startedAt: Date.now(),
  };

  await stage.execute(ctx);
  assertEquals(uploadCalled, true);

  await Deno.remove(tmpFile);
});

Deno.test("UploadStage — enqueues to UploadQueueManager on failure", async () => {
  const queue = new UploadQueueManager({ maxRetries: 0, baseDelayMs: 10 });
  queue.setOffline(true);
  let enqueued = false;
  const originalEnqueue = queue.enqueue.bind(queue);
  queue.enqueue = (item) => {
    enqueued = true;
    return originalEnqueue(item);
  };
  queue.setProcessor(async () => true);

  const mockClient: IRpcClient = {
    sendRequest: () => Promise.reject(new Error("upload failed")),
  };

  const stage = new UploadStage(makeExecutor(mockClient), undefined, queue);
  const ctx: PipelineContext = {
    localPath: "/p/test.ts",
    gameServer: "home",
    gameFilename: "test.ts",
    bundledContent: "content",
    startedAt: Date.now(),
  };

  let threw = false;
  try {
    await stage.execute(ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(enqueued, true);
});
