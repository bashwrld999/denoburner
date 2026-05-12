interface CacheEntry {
  hash: string;
  lastUploaded: Date;
  size: number;
  server: string;
  filename: string;
}

export class FileCache {
  private cache = new Map<string, CacheEntry>();

  async needsUpload(filePath: string, server: string, _filename: string): Promise<boolean> {
    const key = `${server}:${filePath}`;
    const entry = this.cache.get(key);
    if (!entry) return true;
    try {
      const currentContent = await Deno.readTextFile(filePath);
      const currentHash = await this.hash(currentContent);
      return currentHash !== entry.hash;
    } catch {
      return false;
    }
  }

  async hasContentChanged(filePath: string, server: string, content: string): Promise<boolean> {
    const key = `${server}:${filePath}`;
    const entry = this.cache.get(key);
    if (!entry) return true;
    const currentHash = await this.hash(content);
    return currentHash !== entry.hash;
  }

  async markUploaded(filePath: string, server: string, filename: string, content: string): Promise<void> {
    const key = `${server}:${filePath}`;
    this.cache.set(key, {
      hash: await this.hash(content),
      lastUploaded: new Date(),
      size: content.length,
      server,
      filename,
    });
  }

  remove(filePath: string, server: string): boolean {
    return this.cache.delete(`${server}:${filePath}`);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { entries: number; totalSize: number } {
    let totalSize = 0;
    for (const e of this.cache.values()) totalSize += e.size;
    return { entries: this.cache.size, totalSize };
  }

  async hash(content: string): Promise<string> {
    const data = new TextEncoder().encode(content);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

export function createFileCache(): FileCache {
  return new FileCache();
}
