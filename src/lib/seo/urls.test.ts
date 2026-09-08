import { describe, expect, it } from "vitest";
import { absoluteUrl, encodePath, siteOrigin } from "./urls";

const BASE = "https://cidapt.com";

describe("siteOrigin", () => {
  it("strips a trailing slash so joins are not double-slashed", () => {
    expect(siteOrigin("https://cidapt.com/")).toBe("https://cidapt.com");
    expect(siteOrigin("https://cidapt.com///")).toBe("https://cidapt.com");
  });
});

describe("absoluteUrl", () => {
  it("leaves Thai unprefixed (§14 decision 21)", () => {
    expect(absoluteUrl(BASE, "th", "/product/a")).toBe("https://cidapt.com/product/a");
  });

  it("prefixes every other locale", () => {
    expect(absoluteUrl(BASE, "en", "/product/a")).toBe("https://cidapt.com/en/product/a");
    expect(absoluteUrl(BASE, "zh-Hans", "/news")).toBe("https://cidapt.com/zh-Hans/news");
  });

  it("does not leave a trailing slash on the Thai homepage", () => {
    // A canonical of "https://cidapt.com/" and a sitemap entry of
    // "https://cidapt.com" would be two URLs for one page.
    expect(absoluteUrl(BASE, "th", "/")).toBe("https://cidapt.com");
  });

  it("keeps the prefix alone for a prefixed homepage", () => {
    expect(absoluteUrl(BASE, "en", "/")).toBe("https://cidapt.com/en");
  });
});

describe("encodePath", () => {
  it("percent-encodes a Thai slug segment by segment", () => {
    expect(encodePath("/product/พวงหรีด")).toBe(
      "/product/%E0%B8%9E%E0%B8%A7%E0%B8%87%E0%B8%AB%E0%B8%A3%E0%B8%B5%E0%B8%94",
    );
  });

  it("leaves the separators alone", () => {
    expect(encodePath("/category/a/b")).toBe("/category/a/b");
  });

  it("encodes a segment containing a slash-unsafe character", () => {
    expect(encodePath("/product/a?b")).toBe("/product/a%3Fb");
  });
});
