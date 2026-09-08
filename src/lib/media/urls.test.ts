import { describe, expect, it } from "vitest";
import { focalPosition, renditions } from "./urls";

describe("renditions", () => {
  it("offers AVIF before WebP before JPEG, as <picture> needs", () => {
    const r = renditions("2026/09/k", [400]);
    expect(r.map((x) => x.format)).toEqual(["avif", "webp", "jpeg"]);
    expect(r[0]?.url).toBe("/media/2026/09/k/400.avif");
    expect(r[2]?.url).toBe("/media/2026/09/k/400.jpg");
  });

  it("serves from /media/* so the Cloudflare cache rule in §11 applies", () => {
    expect(renditions("k", [800]).every((r) => r.url.startsWith("/media/"))).toBe(true);
  });
});

describe("focalPosition", () => {
  it("formats a CSS object-position", () => {
    expect(focalPosition(78, 19)).toBe("78% 19%");
  });

  it("clamps out-of-range values rather than emitting invalid CSS", () => {
    expect(focalPosition(-10, 140)).toBe("0% 100%");
  });

  it("rounds fractional percentages", () => {
    expect(focalPosition(33.4, 66.6)).toBe("33% 67%");
  });
});
