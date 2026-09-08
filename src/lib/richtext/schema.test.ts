import { describe, expect, it } from "vitest";
import {
  EMPTY_DOC,
  docToText,
  isEmptyDoc,
  referencedMediaIds,
  richDocSchema,
  sanitizeDoc,
} from "./schema";

const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

describe("sanitizeDoc — hostile input", () => {
  it("drops a script node entirely", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [{ type: "script", content: [{ type: "text", text: "alert(1)" }] }, p("ปลอดภัย")],
    });
    expect(out.content).toHaveLength(1);
    expect(docToText(out)).toBe("ปลอดภัย");
  });

  it("drops a javascript: link but keeps its text", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "กดที่นี่",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(out)).not.toContain("javascript");
    expect(docToText(out)).toBe("กดที่นี่");
  });

  it("drops data: and vbscript: links", () => {
    for (const href of [
      "data:text/html;base64,PHNjcmlwdD4=",
      "vbscript:msgbox",
      "  javascript:x",
    ]) {
      const out = sanitizeDoc({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href } }] }],
          },
        ],
      });
      const text = out.content[0];
      expect(text?.type).toBe("paragraph");
      expect(JSON.stringify(out)).not.toContain(href);
    }
  });

  it("keeps http, https, mailto, tel and site-relative links", () => {
    for (const href of [
      "https://line.me/x",
      "http://a.test",
      "mailto:a@b.test",
      "tel:021234567",
      "/contact",
    ]) {
      const out = sanitizeDoc({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href } }] }],
          },
        ],
      });
      expect(JSON.stringify(out)).toContain(href);
    }
  });

  it("strips unknown attributes such as event handlers", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [
        {
          type: "paragraph",
          onclick: "steal()",
          style: "position:fixed",
          content: [{ type: "text", text: "ok", onmouseover: "x" }],
        },
      ],
    });
    const json = JSON.stringify(out);
    expect(json).not.toContain("onclick");
    expect(json).not.toContain("onmouseover");
    expect(json).not.toContain("style");
    expect(docToText(out)).toBe("ok");
  });

  it("strips unknown marks such as a fabricated html mark", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "hi",
              marks: [{ type: "rawHtml", attrs: { html: "<img onerror=x>" } }],
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(out)).not.toContain("rawHtml");
    expect(JSON.stringify(out)).not.toContain("onerror");
  });

  it("refuses an image with a URL — images carry a mediaId, so hotlinking is inexpressible", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [{ type: "image", attrs: { src: "https://evil.test/a.png" } }],
    });
    expect(out.content).toHaveLength(0);
    expect(JSON.stringify(out)).not.toContain("evil.test");
  });

  it("keeps an image that names a media row", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { mediaId: "01a07e37-2ade", alt: "ภาพงานอบรม", src: "https://evil.test/x" },
        },
      ],
    });
    expect(out.content[0]).toEqual({
      type: "image",
      attrs: { mediaId: "01a07e37-2ade", alt: "ภาพงานอบรม" },
    });
    expect(JSON.stringify(out)).not.toContain("evil.test");
  });

  it("clamps a heading level so an h1 cannot compete with the page title", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "T" }] }],
    });
    const h = out.content[0];
    expect(h?.type === "heading" && h.attrs.level).toBe(2);
  });

  it("returns an empty document for junk rather than throwing", () => {
    expect(sanitizeDoc(null)).toEqual(EMPTY_DOC);
    expect(sanitizeDoc("<script>alert(1)</script>")).toEqual(EMPTY_DOC);
    expect(sanitizeDoc({ type: "notADoc" })).toEqual(EMPTY_DOC);
    expect(sanitizeDoc([])).toEqual(EMPTY_DOC);
    expect(sanitizeDoc(undefined)).toEqual(EMPTY_DOC);
  });

  it("output always satisfies the schema", () => {
    const nasty = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "a", marks: [{ type: "link", attrs: { href: "javascript:x" } }] },
          ],
        },
        { type: "table", content: [{ type: "row" }] },
        { type: "image", attrs: { src: "http://x" } },
        { type: "heading", attrs: { level: 9 }, content: [] },
      ],
    };
    expect(richDocSchema.safeParse(sanitizeDoc(nasty)).success).toBe(true);
  });
});

describe("sanitizeDoc — legitimate content", () => {
  it("keeps Thai text, bold, lists and blockquotes", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "หัวข้อ" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "ตัวหนา", marks: [{ type: "bold" }] },
            { type: "hardBreak" },
          ],
        },
        { type: "bulletList", content: [{ type: "listItem", content: [p("รายการหนึ่ง")] }] },
        { type: "blockquote", content: [p("คำพูด")] },
        { type: "horizontalRule" },
      ],
    };
    const out = sanitizeDoc(doc);
    expect(out.content.map((b) => b.type)).toEqual([
      "heading",
      "paragraph",
      "bulletList",
      "blockquote",
      "horizontalRule",
    ]);
    expect(docToText(out)).toContain("รายการหนึ่ง");
  });

  it("keeps nested list paragraphs but drops non-paragraph children", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [p("ok"), { type: "script" }] }],
        },
      ],
    });
    const list = out.content[0];
    expect(list?.type).toBe("bulletList");
    expect(list?.type === "bulletList" && list.content[0]?.content).toHaveLength(1);
  });
});

describe("helpers", () => {
  it("collects referenced media ids without duplicates", () => {
    const doc = sanitizeDoc({
      type: "doc",
      content: [
        { type: "image", attrs: { mediaId: "a" } },
        { type: "image", attrs: { mediaId: "b" } },
        { type: "image", attrs: { mediaId: "a" } },
      ],
    });
    expect(referencedMediaIds(doc).sort()).toEqual(["a", "b"]);
  });

  it("treats a document with only whitespace as empty, but not one with an image", () => {
    expect(isEmptyDoc(sanitizeDoc({ type: "doc", content: [p("   ")] }))).toBe(true);
    expect(isEmptyDoc(sanitizeDoc({ type: "doc", content: [p("มีเนื้อหา")] }))).toBe(false);
    expect(isEmptyDoc(EMPTY_DOC)).toBe(true);
    expect(
      isEmptyDoc(
        sanitizeDoc({ type: "doc", content: [{ type: "image", attrs: { mediaId: "a" } }] }),
      ),
    ).toBe(false);
  });
});
