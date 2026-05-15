import { assertEquals, assert } from "@std/assert";
import {
  DenoburnerError,
  ConfigError,
  NetworkError,
  RpcError,
  PipelineError,
  WatcherError,
  toDenoburnerError,
  ErrorCodes,
} from "../../src/core/errors.ts";

Deno.test("DenoburnerError — sets name, code, and context", () => {
  const e = new DenoburnerError("test error", ErrorCodes.CONFIG_INVALID, { key: "value" });
  assertEquals(e.name, "DenoburnerError");
  assertEquals(e.code, ErrorCodes.CONFIG_INVALID);
  assertEquals(e.context.key, "value");
  assertEquals(e.message, "test error");
});

Deno.test("DenoburnerError — defaults to UNKNOWN code", () => {
  const e = new DenoburnerError("oops");
  assertEquals(e.code, ErrorCodes.UNKNOWN);
});

Deno.test("ConfigError — has correct name and code", () => {
  const e = new ConfigError("bad config");
  assertEquals(e.name, "ConfigError");
  assertEquals(e.code, ErrorCodes.CONFIG_INVALID);
});

Deno.test("NetworkError — has correct name and code", () => {
  const e = new NetworkError("connection lost");
  assertEquals(e.name, "NetworkError");
  assertEquals(e.code, ErrorCodes.NETWORK_DISCONNECTED);
});

Deno.test("RpcError — has correct name, code, and rpcCode", () => {
  const e = new RpcError("method not found", -32601);
  assertEquals(e.name, "RpcError");
  assertEquals(e.code, ErrorCodes.RPC_ERROR);
  assertEquals(e.rpcCode, -32601);
});

Deno.test("PipelineError — has correct name and code", () => {
  const e = new PipelineError("stage failed", { stage: "bundle", file: "test.ts" });
  assertEquals(e.name, "PipelineError");
  assertEquals(e.code, ErrorCodes.PIPELINE_STAGE_FAILED);
  assertEquals(e.context.stage, "bundle");
});

Deno.test("WatcherError — has correct name and code", () => {
  const e = new WatcherError("cannot watch");
  assertEquals(e.name, "WatcherError");
  assertEquals(e.code, ErrorCodes.WATCHER_ACCESS_DENIED);
});

Deno.test("toDenoburnerError — passes through DenoburnerError", () => {
  const original = new ConfigError("test");
  const result = toDenoburnerError(original);
  assert(result === original);
});

Deno.test("toDenoburnerError — wraps Error", () => {
  const original = new Error("something broke");
  const result = toDenoburnerError(original, ErrorCodes.PIPELINE_STAGE_FAILED);
  assert(result instanceof DenoburnerError);
  assertEquals(result.message, "something broke");
  assertEquals(result.code, ErrorCodes.PIPELINE_STAGE_FAILED);
});

Deno.test("toDenoburnerError — wraps string", () => {
  const result = toDenoburnerError("raw string error");
  assert(result instanceof DenoburnerError);
  assertEquals(result.message, "raw string error");
});

Deno.test("DenoburnerError — is instance of Error", () => {
  const e = new DenoburnerError("test");
  assert(e instanceof Error);
  assert(e instanceof DenoburnerError);
});

Deno.test("ErrorCodes — all codes are strings", () => {
  for (const code of Object.values(ErrorCodes)) {
    assertEquals(typeof code, "string");
  }
});
