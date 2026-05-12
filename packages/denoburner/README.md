# denoburner

Bitburner Remote API sync tool. Watches local script files, bundles them with esbuild, and uploads to Bitburner via WebSocket.

## Quick Start

### 1. Game Setup

1. Open Bitburner
2. Go to **Options → Remote API**
3. Set the WebSocket server URL to `ws://localhost:12525`
4. Click **Connect**

### 2. Run the tool

```bash
# From the workspace root
deno run -A packages/denoburner/src/cli/index.ts dev
```

Or from the package directory:

```bash
cd packages/denoburner
deno run -A ./src/cli/index.ts dev
```

### 3. Directory Structure Convention

Place scripts in `src/servers/{serverName}/` — the tool auto-detects the game server from the path:

```
src/
└── servers/
    ├── home/
    │   ├── hack.ts
    │   ├── grow.ts
    │   └── weaken.ts
    └── n00dles/
        └── early_hack.ts
```

Files outside a `servers/` directory use the default server (`home`).

## Commands

### `denoburner dev`

Start WebSocket server, watch files, upload on change.

```
Usage: denoburner dev [--port 12525] [--host localhost] [--server home] [--quiet] [--verbose]
```

- `--port, -p` — WebSocket server port (default: 12525)
- `--host` — WebSocket server host (default: localhost)
- `--server` — Default in-game server (default: home)
- `--quiet` — Disable TUI, plain log output
- `--verbose` — Enable detailed TUI output (cascade info, etc.)
- `--dry-run` — Scan and log files without uploading
- `--types` — Download NetscriptDefinitions.d.ts on connect (default: true)
- `--no-types` — Skip type definition download
- `--config, -c` — Path to config file

### `denoburner init`

Scaffold a new denoburner project in the current directory.

```
Usage: denoburner init [--dir .]
```

- `--dir` — Target directory (default: current directory)

Creates `denoburner.config.ts`, `src/servers/home/main.ts`, `src/lib/helpers.ts`, and `.gitignore`.

### `denoburner build`

Bundle all scripts to `./dist` without uploading.

```
Usage: denoburner build [--root ./src] [--outDir ./dist] [--types] [--port 12525]
```

- `--root` — Local scripts root directory (default: ./src)
- `--outDir, -o` — Output directory (default: ./dist)
- `--types` — Fetch `NetscriptDefinitions.d.ts` from Bitburner (default: true)
- `--no-types` — Skip type definitions
- `--port` — WS port for type fetching (default: 12525)
- `--host` — WS host for type fetching (default: localhost)
- `--config` — Path to config file

### `denoburner download`

Download all scripts from a game server to disk.

```
Usage: denoburner download [--server home] [--out ./src] [--port 12525] [--host localhost]
```

- `--server` — In-game server to download from (default: home)
- `--out` — Local output directory (default: ./src)
- `--port` — WS port (default: 12525)
- `--host` — WS host (default: localhost)
- `--config` — Path to config file

### `denoburner servers`

List all game servers with file counts and RAM usage. Requires a running `denoburner dev` instance.

```
Usage: denoburner servers [--port 12525] [--host localhost] [--config ./denoburner.config.ts]
```

- `--port` — WS port (default: 12525)
- `--host` — WS host (default: localhost)
- `--config` — Path to config file

### `denoburner exec`

Push a local script to a game server, execute it, and print the output.

```
Usage: denoburner exec <script> [--server home] [--port 12525] [--host localhost] [--args "arg1,arg2"]
```

- `<script>` — Path to local script file (required)
- `--server` — Target server (default: home)
- `--args` — Comma-separated arguments passed to the script
- `--port` — WS port (default: 12525)
- `--host` — WS host (default: localhost)
- `--config, -c` — Path to config file

## TUI Key Bindings

| Key | Action |
|-----|--------|
| `q` / `Ctrl+C` / `Ctrl+D` | Quit the tool |
| `c` | Clear the console log |
| `e` | Cycle server file list expansion |
| `l` | Cycle log level filter (all → error → warn → info → success → debug) |

The TUI shows a box-drawn split-panel layout with:
- **Left panel** (20%): Connection status header (green/red background), uptime, queue status, upload/skip/error counts, expandable server file lists, total stats, keybind bar
- **Right panel** (80%): Timestamped log output with colored `[Category/LEVEL]` tags

## Configuration

Auto-detect `denoburner.config.ts` from current directory, or use `--config` to specify a path.

```ts
// denoburner.config.ts
import { defineConfig } from "denoburner";

export default defineConfig({
  defaultServer: "home",
  port: 12525,
  host: "localhost",
  watch: [
    { pattern: "src/servers/**/*.{js,ts,jsx,tsx}", mode: "bundle" },
    { pattern: "src/**/*.{txt,script,json}", mode: "passthrough" },
  ],
  ignore: ["**/*.d.ts"],
  // sourceMap: true,          // Enable source maps in bundled output
  // minify: false,             // Minify bundled output
  // timeout: 30000,            // RPC timeout in ms
  // ignoreInitial: false,      // Skip initial upload, only watch for changes
  // serversDir: "src/servers", // Directory containing game server subdirectories
  // hmr: {
  //   batchDelay: 100,         // HMR batch delay in ms
  //   maxCascadeDepth: 10,     // Max depth for cascading dependency updates
  // },
});
```

### BundleMode

| Mode | TS→JS | Import handling | Use case |
|------|:-----:|-----------------|----------|
| `passthrough` | No | Left as-is | `.txt`, `.script`, `.json`, static assets |
| `transpile` | Yes | All imports kept | Shared lib files (consumers handle bundling) |
| `bundle` | Yes | Same-server imports → external (keep); outside → bundled | Game scripts pushed to Bitburner |

## File Logging

Add `logFile` to your config to persist logs to a file:

```ts
export default defineConfig({
  // ... other config
  logFile: "denoburner.log",
});
```

Logs are written with `[HH:MM:SS] [LEVEL] [category] message` format. Files rotate when they exceed 10MB.

## Connection & Reconnection

`denoburner dev` starts a WebSocket server that Bitburner connects to. When the connection drops:

1. **Dev server stays running** — continues watching files
2. **Upload queue goes offline** — file changes are queued but not sent
3. **Reconnection is automatic** — when Bitburner reconnects, the queue drains and pending uploads are sent

The tool sends a keepalive ping every 30 seconds. If a command (download/exec) disconnects, it retries with exponential backoff (1s, 2s, 4s, 8s, up to 30s).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `Port already in use` | Another instance running | `denoburner dev --port 12526` or kill the other process |
| `No matching watch pattern` | File outside watched roots | Check `watch` patterns in config — default watches `src/` |
| `Connection refused` | Game not running or wrong port | Verify Bitburner Remote API is configured to `ws://localhost:12525` |
| `0 files watched` | No files match extensions | Ensure files have `.ts`, `.js`, `.jsx`, `.tsx`, `.txt`, or `.script` extension |
| `ESBuild error` | TypeScript syntax issue | Run `deno check` on the file to find syntax errors |
| Nothing happens after connect | Config watch patterns don't match | Add `--verbose` to see which files are detected |

## Architecture

```
dev command
  │
  ├── ConfigLoader → DenoburnerConfig
  ├── TuiEventBus ←────────────────────────────────────┐
  ├── AnsiRenderer (subscribes to TuiEventBus)          │
  ├── WebSocketServer (waits for Bitburner)             │
  │     └── on connect → RpcClient ←──┐                 │
  ├── FileWatcher (debounced)         │                 │
  │     └── on change → UploadPipeline                  │
  │         ├── GlobFilterStage      │                 │
  │         ├── ReadFileStage        │                 │
  │         ├── BundleStage → EsbuildBundler            │
  │         ├── PathMapStage         │                 │
  │         ├── RamCheckStage →──────┴─ RpcClient       │
  │         ├── UploadStage →────────── RpcClient       │
  │         └── NotifyStage →────────── TuiEventBus ────┘
  │
  └── InitialSync (run pipeline on all files at start)
```

## How to Add a Pipeline Stage

1. **Create the stage file** in `src/pipeline/stages/` implementing `PipelineStage`:

```ts
import type { PipelineStage, PipelineContext } from "../types.ts";

export class MyStage implements PipelineStage {
  readonly name = "my_stage";

  constructor(private deps: MyDeps) {}

  async execute(ctx: PipelineContext): Promise<void> {
    // Read from ctx, mutate ctx
    ctx.myResult = await this.deps.doSomething(ctx.rawContent);
  }
}
```

2. **Add it to the pipeline** in the composition root (`src/main.ts`):

```ts
return new UploadPipeline()
  .use(new GlobFilterStage(config))
  .use(new ReadFileStage())
  .use(new MyStage(deps))        // <-- insert here
  .use(new BundleStage(bundler))
  .use(...);
```

3. **Wire dependencies** — if your stage needs external dependencies (RPC client, logger, etc.), add them to the factory function's parameters.

4. **Add skip/error handling** — set `ctx.skipped = true` to skip remaining stages, or throw to trigger error capture.

5. **Write tests** — create `my_stage_test.ts` with a mock for your dependencies.

## API Methods

The tool communicates with Bitburner via JSON-RPC 2.0 over WebSocket:

| Method | Params | Result | Used by |
|--------|--------|--------|---------|
| `pushFile` | `{ filename, content, server }` | `{ success: true }` | dev |
| `getFile` | `{ filename, server }` | `{ content: string }` | download |
| `getFileNames` | `{ server }` | `string[]` | download |
| `getAllFiles` | `{ server }` | `[{ filename, content }]` | download |
| `getAllFileMetadata` | `{ server }` | `[{ filename, atime, btime, mtime }]` | download |
| `deleteFile` | `{ filename, server }` | `{ success: true }` | future |
| `calculateRam` | `{ filename, server }` | `{ ram: number }` | dev |
| `getDefinitionFile` | (none) | `{ content: string }` | build |
| `getAllServers` | (none) | `string[]` | dev |

## Permissions

Minimum required: `--allow-net --allow-read --allow-write --allow-run --allow-env`

Or use `-A` for convenience:

```bash
deno run -A packages/denoburner/src/cli/index.ts dev
```

## Development

```bash
# Type-check all files
deno check --config deno.json

# Run tests
deno test -A --config deno.json

# Run with live reload
deno run --watch -A packages/denoburner/src/cli/index.ts dev
```
