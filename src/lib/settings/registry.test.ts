import { describe, expect, it } from "vitest";
import { SETTINGS, SETTING_KEYS, defaultsFor, parseGlobal, parseLocalized } from "./registry";

describe("registry", () => {
  it("covers the keys phase 6 names", () => {
    expect(SETTING_KEYS.sort()).toEqual(["contact", "general", "line", "seo", "theme"]);
  });

  it("every key's own defaults satisfy its own schema", () => {
    for (const key of SETTING_KEYS) {
      const def = SETTINGS[key];
      expect(def.global.safeParse(def.globalDefault).success, `${key} global`).toBe(true);
      if (def.localized) {
        expect(def.localized.safeParse(def.localizedDefault).success, `${key} localized`).toBe(
          true,
        );
      }
    }
  });
});

describe("parseGlobal / parseLocalized", () => {
  it("falls back to the default when the row is missing — a fresh install renders", () => {
    expect(parseGlobal("theme", undefined).colorBrand).toBe("#880924");
    expect(parseLocalized("line", undefined).buttonLabel).toBe("สั่งซื้อ / สอบถามทาง LINE");
  });

  it("falls back rather than throwing on a corrupt row", () => {
    expect(parseGlobal("theme", { colorBrand: "not-a-colour" }).colorBrand).toBe("#880924");
    expect(parseGlobal("theme", "garbage").colorBrand).toBe("#880924");
    expect(parseGlobal("theme", null).colorBrand).toBe("#880924");
  });

  it("keeps stored values that are valid", () => {
    expect(parseGlobal("theme", { colorBrand: "#123456" }).colorBrand).toBe("#123456");
  });

  it("fills gaps in a partial row from the defaults", () => {
    const parsed = parseGlobal("theme", { colorBrand: "#123456" });
    expect(parsed.colorBrand).toBe("#123456");
    expect(parsed.colorAccent).toBe("#0b7a3f");
  });

  it("normalises a hex colour to lower case", () => {
    expect(parseGlobal("theme", { colorBrand: "#AABBCC" }).colorBrand).toBe("#aabbcc");
  });

  it("returns an empty object for a key with no localized half", () => {
    expect(parseLocalized("theme", { anything: 1 })).toEqual({});
  });
});

describe("line settings", () => {
  it("stores the OA handle and adds the @ if the operator omits it", () => {
    expect(parseGlobal("line", { oaId: "355kxfoj" }).oaId).toBe("@355kxfoj");
    expect(parseGlobal("line", { oaId: "@355kxfoj" }).oaId).toBe("@355kxfoj");
  });

  it("rejects a pasted URL, which is not a handle", () => {
    // Falls back rather than storing something /go/line cannot build a link from.
    expect(parseGlobal("line", { oaId: "https://line.me/ti/p/%40355kxfoj" }).oaId).toBe(
      "@355kxfoj",
    );
  });

  it("defaults the message template with the placeholders §8 specifies", () => {
    const t = defaultsFor("line").messageTemplate;
    expect(t).toContain("{product_name}");
    expect(t).toContain("{product_url}");
  });
});

describe("empty optional fields", () => {
  it("become undefined rather than empty strings", () => {
    const parsed = parseGlobal("contact", { phone: "  ", email: "", mapEmbedUrl: "" });
    expect(parsed.phone).toBeUndefined();
    expect(parsed.email).toBeUndefined();
    expect(parsed.mapEmbedUrl).toBeUndefined();
  });
});

describe("defaultsFor", () => {
  it("merges the global and localized halves", () => {
    const d = defaultsFor("general");
    expect(d.siteName).toBe("ทัณฑสถานบำบัดพิเศษกลาง");
    expect(d.organisation).toBe("กรมราชทัณฑ์ กระทรวงยุติธรรม");
  });

  it("leaves SEO indexing off until phase 10 opts in", () => {
    expect(defaultsFor("seo").allowIndexing).toBe(false);
  });
});
