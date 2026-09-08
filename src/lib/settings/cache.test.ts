import { describe, expect, it } from "vitest";
import { SETTINGS_TTL_MS, TtlCache } from "./cache";

describe("TtlCache", () => {
  const t0 = 1_000_000;

  it("returns a value inside the TTL", () => {
    const c = new TtlCache<string>(1000);
    c.set("k", "v", t0);
    expect(c.get("k", t0 + 999)).toBe("v");
  });

  it("expires exactly at the TTL, not after it", () => {
    const c = new TtlCache<string>(1000);
    c.set("k", "v", t0);
    expect(c.get("k", t0 + 1000)).toBeUndefined();
  });

  it("drops the expired entry rather than leaving it to grow", () => {
    const c = new TtlCache<string>(1000);
    c.set("k", "v", t0);
    c.get("k", t0 + 2000);
    expect(c.size).toBe(0);
  });

  it("busts one key on write without touching the others", () => {
    const c = new TtlCache<string>(1000);
    c.set("a", "1", t0);
    c.set("b", "2", t0);
    c.delete("a");
    expect(c.get("a", t0)).toBeUndefined();
    expect(c.get("b", t0)).toBe("2");
  });

  it("clears everything", () => {
    const c = new TtlCache<string>(1000);
    c.set("a", "1", t0);
    c.set("b", "2", t0);
    c.clear();
    expect(c.size).toBe(0);
  });

  it("defaults to the 60 second TTL the spec asks for", () => {
    expect(SETTINGS_TTL_MS).toBe(60_000);
    const c = new TtlCache<string>();
    c.set("k", "v", t0);
    expect(c.get("k", t0 + 59_999)).toBe("v");
    expect(c.get("k", t0 + 60_000)).toBeUndefined();
  });
});
