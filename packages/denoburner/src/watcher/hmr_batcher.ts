export class HmrBatcher {
  private pending = new Set<string>();
  private timer: number | null = null;

  constructor(
    private batchDelay: number,
    private onBatch: (files: string[]) => void,
  ) {}

  add(file: string): void {
    this.pending.add(file);
    if (this.timer === null) {
      this.timer = setTimeout(() => this.flush(), this.batchDelay);
    }
  }

  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pending.size > 0) {
      const batch = [...this.pending];
      this.pending.clear();
      this.onBatch(batch);
    }
  }

  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending.clear();
  }
}
