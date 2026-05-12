export interface FileChangeEvent {
  type: "modify" | "create" | "remove";
  path: string;
}

export interface WatchOptions {
  exts?: string[];
  skip?: RegExp[];
  gitignore?: boolean;
}

export interface IFileWatcher {
  watch(paths: string[], options?: WatchOptions): void;
  onChange(handler: (event: FileChangeEvent) => void): void;
  close(): void;
}
