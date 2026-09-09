import { describe, expect, it } from "vitest";
import { emptySection, parseSectionsForEditing, sanitizeSections, SECTION_TYPES } from "./schema";

const hero = { id: "a", type: "hero", isVisible: true, showSeal: true };

describe("sanitizeSections", () => {
  it("keeps a well-formed block", () => {
    expect(sanitizeSections([hero])).toHaveLength(1);
  });

  it("drops an unknown block type rather than carrying it through", () => {
    // §6: unknown types render as nothing in production.
    expect(sanitizeSections([hero, { id: "b", type: "carousel_3d" }])).toHaveLength(1);
  });

  it("drops a block whose required field is missing", () => {
    expect(sanitizeSections([{ type: "hero", isVisible: true }])).toEqual([]);
  });

  it("returns an empty array for a non-array value", () => {
    // The column defaults to [] but an older row could hold anything.
    expect(sanitizeSections(null)).toEqual([]);
    expect(sanitizeSections({ type: "hero" })).toEqual([]);
  });

  it("refuses a javascript: cta href", () => {
    const block = { ...hero, ctaLabel: "คลิก", ctaHref: "javascript:alert(1)" };
    expect(sanitizeSections([block])).toEqual([]);
  });

  it("accepts an internal path and an https url as cta hrefs", () => {
    expect(sanitizeSections([{ ...hero, ctaHref: "/categories" }])).toHaveLength(1);
    expect(sanitizeSections([{ ...hero, ctaHref: "https://correct.go.th" }])).toHaveLength(1);
  });

  it("strips unsafe rich text through the phase-5 whitelist", () => {
    const result = sanitizeSections([
      {
        id: "r",
        type: "rich_text",
        isVisible: true,
        body: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "ok" }] },
            { type: "rawHtml", attrs: { html: "<script>x</script>" } },
          ],
        },
      },
    ]);
    expect(result).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("rawHtml");
    expect(JSON.stringify(result)).not.toContain("script");
  });

  it("caps the array so one page cannot hold unbounded blocks", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ ...hero, id: `h${i}` }));
    expect(sanitizeSections(many)).toHaveLength(40);
  });
});

describe("parseSectionsForEditing", () => {
  it("reports an unknown type instead of discarding it silently", () => {
    // §6: "unknown block types render ... as a warning in the admin", which is
    // only possible if the editor can see that something was there.
    const parsed = parseSectionsForEditing([hero, { id: "b", type: "carousel_3d" }]);
    expect(parsed).toHaveLength(2);
    expect(parsed[1]).toEqual({ ok: false, id: "b", type: "carousel_3d" });
  });
});

describe("emptySection", () => {
  it("produces a block that survives its own sanitizer, for every type", () => {
    for (const type of SECTION_TYPES) {
      const block = emptySection(type, `id-${type}`);
      expect(sanitizeSections([block]), `type ${type}`).toHaveLength(1);
    }
  });
});
