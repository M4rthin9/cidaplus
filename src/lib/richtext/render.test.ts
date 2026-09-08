import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichText, type MediaLookup } from "./render";
import { sanitizeDoc } from "./schema";

/**
 * Renders the whitelist to real markup and asserts what can and cannot appear.
 * Uses createElement rather than JSX only because the test runner's transform
 * does not handle .tsx here; the component under test is unchanged.
 */

const noMedia: MediaLookup = new Map();
const withMedia: MediaLookup = new Map([
  [
    "m1",
    {
      id: "m1",
      storageKey: "2026/09/abc",
      filename: "a.jpg",
      blurhash: null,
      focalX: 50,
      focalY: 50,
      alt: "ภาพจากคลัง",
    },
  ],
]);

const html = (doc: unknown, media: MediaLookup = noMedia) =>
  renderToStaticMarkup(createElement(RichText, { doc: sanitizeDoc(doc), media }));

const para = (text: string, marks?: unknown[]) => ({
  type: "paragraph",
  content: [marks ? { type: "text", text, marks } : { type: "text", text }],
});

describe("RichText renderer", () => {
  it("escapes text that looks like markup — there is no HTML string to inject into", () => {
    const out = html({ type: "doc", content: [para("<script>alert(1)</script>")] });
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("renders Thai text and bold as real elements", () => {
    expect(html({ type: "doc", content: [para("ตัวหนา", [{ type: "bold" }])] })).toContain(
      "<strong>ตัวหนา</strong>",
    );
  });

  it("gives an external link rel=noopener and target=_blank", () => {
    const out = html({
      type: "doc",
      content: [para("LINE", [{ type: "link", attrs: { href: "https://line.me/x" } }])],
    });
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("does not add target or rel to an internal link", () => {
    const out = html({
      type: "doc",
      content: [para("ติดต่อ", [{ type: "link", attrs: { href: "/contact" } }])],
    });
    expect(out).toContain('href="/contact"');
    expect(out).not.toContain('target="_blank"');
  });

  it("a javascript: link never reaches the output — the sanitizer removed the mark", () => {
    const out = html({
      type: "doc",
      content: [para("x", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])],
    });
    expect(out).not.toContain("javascript");
    expect(out).not.toContain("<a ");
  });

  it("renders an image only when its media row was supplied", () => {
    const doc = {
      type: "doc",
      content: [{ type: "image", attrs: { mediaId: "m1", alt: "คำอธิบาย" } }],
    };
    expect(html(doc, withMedia)).toContain("<figure");
    expect(html(doc, noMedia)).not.toContain("<figure");
    expect(html(doc, noMedia)).not.toContain("<img");
  });

  it("renders lists, blockquote and a rule with the right tags", () => {
    const out = html({
      type: "doc",
      content: [
        { type: "bulletList", content: [{ type: "listItem", content: [para("หนึ่ง")] }] },
        { type: "orderedList", content: [{ type: "listItem", content: [para("สอง")] }] },
        { type: "blockquote", content: [para("คำพูด")] },
        { type: "horizontalRule" },
      ],
    });
    expect(out).toContain("<ul");
    expect(out).toContain("<ol");
    expect(out).toContain("<blockquote");
    expect(out).toContain("<hr");
  });

  it("renders headings as h2 or h3, never h1", () => {
    const out = html({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "A" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "B" }] },
      ],
    });
    expect(out).toContain("<h2");
    expect(out).toContain("<h3");
    expect(out).not.toContain("<h1");
  });

  it("renders nothing at all for an empty document", () => {
    expect(html({ type: "doc", content: [] })).toBe("");
  });
});
