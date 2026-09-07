/**
 * In-memory token bucket. SPEC.md §13: "Rate-limit the login route and the
 * contact form (in-memory token bucket is fine at this scale)."
 *
 * Deliberately not the lockout mechanism — this throttles a burst from one
 * source, while the per-account lockout in `auth/lockout.ts` is persisted so a
 * restart cannot clear it. One web container, so a shared map is sufficient.
 */

export type Bucket = { tokens: number; updatedAt: number };

export type RateLimitResult = {
  readonly allowed: boolean;
  /** Whole seconds until at least one token is available. */
  readonly retryAfterSeconds: number;
  readonly remaining: number;
};

export class TokenBucket {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {}

  check(key: string, now: number = Date.now()): RateLimitResult {
    const existing = this.buckets.get(key);
    const bucket: Bucket = existing ?? { tokens: this.capacity, updatedAt: now };

    const elapsedSeconds = Math.max(0, (now - bucket.updatedAt) / 1000);
    const tokens = Math.min(this.capacity, bucket.tokens + elapsedSeconds * this.refillPerSecond);

    if (tokens < 1) {
      this.buckets.set(key, { tokens, updatedAt: now });
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((1 - tokens) / this.refillPerSecond),
        remaining: 0,
      };
    }

    const next = tokens - 1;
    this.buckets.set(key, { tokens: next, updatedAt: now });
    return { allowed: true, retryAfterSeconds: 0, remaining: Math.floor(next) };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  /** Drop buckets that have fully refilled, so the map cannot grow without bound. */
  sweep(now: number = Date.now()): void {
    const fullAfterMs = (this.capacity / this.refillPerSecond) * 1000;
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.updatedAt > fullAfterMs) this.buckets.delete(key);
    }
  }

  get size(): number {
    return this.buckets.size;
  }
}

/** 10 attempts, refilling one per 6 seconds. */
export const loginRateLimit = new TokenBucket(10, 1 / 6);
