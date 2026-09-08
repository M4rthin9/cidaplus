import { describe, expect, it } from "vitest";
import { TokenBucket } from "./rate-limit";

describe("TokenBucket", () => {
  it("allows up to capacity, then refuses", () => {
    const bucket = new TokenBucket(3, 1);
    const now = 1_000_000;
    expect(bucket.check("ip", now).allowed).toBe(true);
    expect(bucket.check("ip", now).allowed).toBe(true);
    expect(bucket.check("ip", now).allowed).toBe(true);
    expect(bucket.check("ip", now).allowed).toBe(false);
  });

  it("keys are independent, so one abuser cannot lock everyone out", () => {
    const bucket = new TokenBucket(1, 1);
    const now = 1_000_000;
    expect(bucket.check("a", now).allowed).toBe(true);
    expect(bucket.check("a", now).allowed).toBe(false);
    expect(bucket.check("b", now).allowed).toBe(true);
  });

  it("refills over time", () => {
    const bucket = new TokenBucket(2, 1);
    const now = 1_000_000;
    bucket.check("ip", now);
    bucket.check("ip", now);
    expect(bucket.check("ip", now).allowed).toBe(false);
    expect(bucket.check("ip", now + 1000).allowed).toBe(true);
  });

  it("reports how long to wait", () => {
    const bucket = new TokenBucket(1, 1 / 6);
    const now = 1_000_000;
    bucket.check("ip", now);
    expect(bucket.check("ip", now).retryAfterSeconds).toBe(6);
  });

  it("never exceeds capacity however long it idles", () => {
    const bucket = new TokenBucket(2, 1);
    const now = 1_000_000;
    bucket.check("ip", now);
    const later = bucket.check("ip", now + 10_000_000);
    expect(later.remaining).toBe(1);
  });

  it("sweeps fully refilled buckets so the map cannot grow without bound", () => {
    const bucket = new TokenBucket(2, 1);
    const now = 1_000_000;
    bucket.check("ip", now);
    expect(bucket.size).toBe(1);
    bucket.sweep(now + 60_000);
    expect(bucket.size).toBe(0);
  });
});
