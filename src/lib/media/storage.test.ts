import { beforeEach, describe, expect, it } from "vitest";
import { newStorageKey, resolveMediaPath } from "./storage";

beforeEach(() => {
  process.env.MEDIA_DIR = "/data/media";
});

describe("resolveMediaPath", () => {
  it("resolves a normal key", () => {
    expect(resolveMediaPath(["2026", "09", "abc", "800.webp"])).toBe(
      "/data/media/2026/09/abc/800.webp",
    );
  });

  it("refuses traversal out of MEDIA_DIR", () => {
    expect(resolveMediaPath(["..", "etc", "passwd"])).toBeNull();
    expect(resolveMediaPath(["2026", "..", "..", "etc", "passwd"])).toBeNull();
  });

  it("refuses empty and dot segments", () => {
    expect(resolveMediaPath([""])).toBeNull();
    expect(resolveMediaPath(["."])).toBeNull();
    expect(resolveMediaPath([])).toBeNull();
  });

  it("does not let a sibling directory sharing the prefix pass", () => {
    process.env.MEDIA_DIR = "/data/media";
    // /data/media-secrets must not be reachable via a prefix match
    expect(resolveMediaPath(["..", "media-secrets", "x"])).toBeNull();
  });
});

describe("newStorageKey", () => {
  it("shards by year and month so no directory grows without bound", () => {
    expect(newStorageKey(new Date("2026-09-07T00:00:00Z"))).toMatch(/^2026\/09\/[0-9a-f-]{36}$/);
  });

  it("pads a single-digit month", () => {
    expect(newStorageKey(new Date("2026-01-31T00:00:00Z"))).toMatch(/^2026\/01\//);
  });

  it("is unique per call", () => {
    expect(newStorageKey()).not.toBe(newStorageKey());
  });
});
