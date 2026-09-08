/**
 * A tiny TTL cache. SPEC.md §6: "Cache settings in memory with a 60-second TTL
 * and bust on write — every page render reads them."
 *
 * Pure and clock-injectable so the expiry rule is testable without waiting.
 * One web container, so a process-local map is sufficient; if the stack ever
 * runs more than one, the TTL is what bounds staleness between them.
 */
export const SETTINGS_TTL_MS = 60_000;

type Entry<V> = { value: V; storedAt: number };

export class TtlCache<V> {
  private readonly entries = new Map<string, Entry<V>>();

  constructor(private readonly ttlMs: number = SETTINGS_TTL_MS) {}

  get(key: string, now: number = Date.now()): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (now - entry.storedAt >= this.ttlMs) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V, now: number = Date.now()): void {
    this.entries.set(key, { value, storedAt: now });
  }

  /** Bust one key on write. */
  delete(key: string): void {
    this.entries.delete(key);
  }

  /** Bust everything — used when a write could affect more than one entry. */
  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
