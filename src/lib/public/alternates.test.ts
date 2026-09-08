import { describe, expect, it } from "vitest";
import { withoutLocalePrefix } from "./alternates";

const LOCALES = ["th", "en", "zh-Hans"];

describe("withoutLocalePrefix", () => {
  it("strips a prefixed locale", () => {
    expect(withoutLocalePrefix("/en/product/wreath", LOCALES)).toBe("/product/wreath");
  });

  it("maps a bare locale root to /", () => {
    expect(withoutLocalePrefix("/en", LOCALES)).toBe("/");
  });

  it("leaves the unprefixed default locale untouched", () => {
    // Thai is served without a prefix (§14 decision 21), so its paths arrive
    // already in the shape next-intl's Link expects back.
    expect(withoutLocalePrefix("/product/พวงหรีด", LOCALES)).toBe("/product/พวงหรีด");
  });

  it("does not strip a path segment that merely starts with a locale code", () => {
    expect(withoutLocalePrefix("/english-lessons", LOCALES)).toBe("/english-lessons");
  });

  it("handles a hyphenated locale code", () => {
    expect(withoutLocalePrefix("/zh-Hans/news/x", LOCALES)).toBe("/news/x");
  });
});
