import { describe, expect, it } from "vitest";
import {
  MAX_SLUG_LENGTH,
  categoryPath,
  productPath,
  slugify,
  slugifyWithFallback,
  uniqueSlug,
} from "./slug";

describe("slugify", () => {
  it("keeps Thai text intact — §14 decision 17", () => {
    expect(slugify("พวงหรีดกระดาษ")).toBe("พวงหรีดกระดาษ");
  });

  it("turns spaces between Thai words into hyphens", () => {
    expect(slugify("พวงหรีด ดอกไม้ประดิษฐ์")).toBe("พวงหรีด-ดอกไม้ประดิษฐ์");
  });

  it("lowercases Latin and keeps digits", () => {
    expect(slugify("Fiberglass Bench 2026")).toBe("fiberglass-bench-2026");
  });

  it("handles a mixed Thai and Latin title", () => {
    expect(slugify("พวงหรีด Premium ขนาด 16 นิ้ว")).toBe("พวงหรีด-premium-ขนาด-16-นิ้ว");
  });

  it("collapses runs of punctuation into one hyphen", () => {
    expect(slugify("ดอกไม้ — ประดิษฐ์!!! (ใหม่)")).toBe("ดอกไม้-ประดิษฐ์-ใหม่");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("  ...ดอกไม้...  ")).toBe("ดอกไม้");
  });

  it("treats U+200B as a word boundary — Thai has no spaces between words", () => {
    expect(slugify("ดอกไม้\u200Bประดิษฐ์")).toBe("ดอกไม้-ประดิษฐ์");
  });

  it("removes ZWNJ, ZWJ and the BOM, which carry no boundary meaning", () => {
    expect(slugify("ดอกไม้\u200C\u200D\uFEFFประดิษฐ์")).toBe("ดอกไม้ประดิษฐ์");
  });

  it("never exceeds the length cap and never ends on a hyphen", () => {
    const long = slugify("ก".repeat(400));
    expect(long.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(long.endsWith("-")).toBe(false);
  });

  it("returns empty for a title with nothing sluggable", () => {
    expect(slugify("!!! ??? ---")).toBe("");
  });
});

describe("slugifyWithFallback", () => {
  it("falls back rather than producing an empty slug", () => {
    expect(slugifyWithFallback("!!!", "01a07e37")).toBe("item-01a07e37");
  });

  it("uses the real slug when there is one", () => {
    expect(slugifyWithFallback("ดอกไม้", "x")).toBe("ดอกไม้");
  });
});

describe("uniqueSlug", () => {
  it("returns the base when it is free", async () => {
    expect(await uniqueSlug("ดอกไม้", async () => false)).toBe("ดอกไม้");
  });

  it("appends a counter until it finds a gap", async () => {
    const taken = new Set(["ดอกไม้", "ดอกไม้-2", "ดอกไม้-3"]);
    expect(await uniqueSlug("ดอกไม้", async (c) => taken.has(c))).toBe("ดอกไม้-4");
  });

  it("keeps the suffixed slug within the length cap", async () => {
    const base = "ก".repeat(MAX_SLUG_LENGTH);
    const out = await uniqueSlug(base, async (c) => c === base);
    expect(out.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(out.endsWith("-2")).toBe(true);
  });

  it("gives up rather than looping forever", async () => {
    await expect(uniqueSlug("x", async () => true, 5)).rejects.toThrow(
      /could not find a free slug/,
    );
  });
});

describe("paths", () => {
  it("serves the default locale unprefixed in v1", () => {
    expect(productPath("th", "ดอกไม้")).toBe("/product/ดอกไม้");
    expect(categoryPath("th", "fiberglass")).toBe("/category/fiberglass");
  });

  it("prefixes every other locale", () => {
    expect(productPath("en", "paper-wreath")).toBe("/en/product/paper-wreath");
  });
});
