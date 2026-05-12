import { relative } from "@std/path";
import { parseServerPath } from "../pipeline/servers.ts";
import { DeleteFileCommand } from "../rpc/commands/delete_file_command.ts";
import type { RpcCommandExecutor } from "../rpc/command.ts";
import type { DenoburnerConfig } from "../config/types.ts";
import type { DependencyGraph } from "../watcher/dependency-graph.ts";
import type { ILogger } from "../logger/interfaces.ts";

export class RenameDetector {
  private pendingDeletes = new Set<string>();

  constructor(
    private config: DenoburnerConfig,
    private cwd: string,
    private depGraph: DependencyGraph,
    private addToBatcher: (path: string) => void,
  ) {}

  hasPending(): boolean {
    return this.pendingDeletes.size > 0;
  }

  onRemove(eventPath: string): void {
    this.pendingDeletes.add(eventPath);
    this.depGraph.remove(eventPath);

    let foundNewFile = false;
    const dir = eventPath.substring(0, Math.max(0, eventPath.lastIndexOf("/")));
    try {
      for (const entry of Deno.readDirSync(dir)) {
        if (!entry.isFile) continue;
        const full = dir + "/" + entry.name;
        if (full === eventPath) continue;
        if (!full.match(/\.(ts|js|jsx|tsx|txt|script)$/i)) continue;
        if (this.depGraph.getAllFiles().includes(full)) continue;
        this.addToBatcher(full);
        foundNewFile = true;
      }
    } catch {
      // directory gone, ignore
    }

    if (!foundNewFile) {
      this.addToBatcher(eventPath);
    }
  }

  async flushDeletes(executor: RpcCommandExecutor, log: ILogger): Promise<void> {
    for (const oldPath of this.pendingDeletes) {
      const parsed = parseServerPath(oldPath, this.config.serversDir);
      const gameFile = parsed ? parsed.relativePath : relative(this.cwd, oldPath);
      try {
        const cmd = new DeleteFileCommand({ server: this.config.defaultServer, filename: gameFile });
        await executor.execute(cmd);
        log.info(`File deleted: ${this.config.defaultServer}/${gameFile}`);
      } catch (err) {
        log.warn(`Could not delete ${this.config.defaultServer}/${gameFile}: ${err}`);
      }
    }
    this.pendingDeletes.clear();
  }
}
