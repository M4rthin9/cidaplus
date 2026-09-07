import { describe, expect, it } from "vitest";
import {
  FALLBACK_LOCALE,
  resolveTranslation,
  resolveTranslations,
  translationCoverage,
} from "./i18n";

type Row = { locale: string; name: string; parentId: string };

const thai: Row = { locale: "th", name: "พวงหรีดแบ่งปัน", parentId: "c1" };
const english: Row = { locale: "en", name: "Shared Wreaths", parentId: "c1" };

describe("resolveTranslation", () => {
  it("returns the requested locale when it exists", () => {
    const got = resolveTranslation([thai, english], "en");
    expect(got?.row.name).toBe("Shared Wreaths");
    expect(got?.locale).toBe("en");
    expect(got?.isFallback).toBe(false);
  });

  it("falls back to Thai when the requested locale is missing — SPEC.md §6", () => {
    const got = resolveTranslation([thai], "en");
    expect(got?.row.name).toBe("พวงหรีดแบ่งปัน");
    expect(got?.locale).toBe(FALLBACK_LOCALE);
    expect(got?.isFallback).toBe(true);
  });

  it("never yields an empty string or a key name on fallback", () => {
    const got = resolveTranslation([thai], "zh-Hans");
    expect(got).toBeDefined();
    expect(got?.row.name.length).toBeGreaterThan(0);
    expect(got?.row.name).not.toBe("name");
  });

  it("returns undefined only when the entity has no translations at all", () => {
    expect(resolveTranslation([], "en")).toBeUndefined();
  });

  it("does not treat Thai as a fallback when Thai was requested", () => {
    const got = resolveTranslation([thai], "th");
    expect(got?.isFallback).toBe(false);
  });
});

describe("resolveTranslations", () => {
  it("resolves each entity independently, mixing exact hits and fallbacks", () => {
    const rows: Row[] = [thai, english, { locale: "th", name: "ดอกไม้ประดิษฐ์", parentId: "c2" }];
    const map = resolveTranslations(rows, (r) => r.parentId, "en");

    expect(map.get("c1")?.isFallback).toBe(false);
    expect(map.get("c1")?.row.name).toBe("Shared Wreaths");
    expect(map.get("c2")?.isFallback).toBe(true);
    expect(map.get("c2")?.row.name).toBe("ดอกไม้ประดิษฐ์");
  });

  it("omits entities with no translations rather than emitting a blank", () => {
    const map = resolveTranslations([], (r: Row) => r.parentId, "en");
    expect(map.size).toBe(0);
  });
});

describe("translationCoverage", () => {
  it("reports which locales are present, for the admin tab dots", () => {
    const coverage = translationCoverage([thai], ["th", "en", "zh-Hans"]);
    expect(coverage.get("th")).toBe(true);
    expect(coverage.get("en")).toBe(false);
    expect(coverage.get("zh-Hans")).toBe(false);
  });
});
