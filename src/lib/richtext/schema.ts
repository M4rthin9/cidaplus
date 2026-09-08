/**
 * The rich-text whitelist. SPEC.md §13, CLAUDE.md.
 *
 * "Sanitize Tiptap JSON on the server before storing; render through a
 * whitelist, never `dangerouslySetInnerHTML` on user input."
 *
 * Two layers on purpose:
 *
 *  1. `sanitizeDoc` REBUILDS the document from scratch, copying across only
 *     node types, marks and attributes named here. Anything else — an unknown
 *     node, a stray attribute, an `onclick`, a raw HTML blob — is not rejected,
 *     it simply never gets copied. Rebuilding rather than filtering means a
 *     shape nobody anticipated cannot survive by being unrecognised.
 *  2. `richDocSchema` then validates the rebuilt result, so a bug in the
 *     rebuilder cannot quietly widen what reaches the database.
 *
 * Images carry a `mediaId`, never a URL. An external image is therefore not
 * expressible in the document model at all, which is what makes CLAUDE.md's
 * "no hotlinked assets" a structural guarantee instead of a review checklist.
 */
import { z } from "zod";

export const HEADING_LEVELS = [2, 3] as const;

/** Schemes a link may use. `javascript:` and `data:` are absent deliberately. */
const SAFE_LINK = /^(https?:\/\/|mailto:|tel:|\/)/i;

const markSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }),
  z.object({ type: z.literal("italic") }),
  z.object({
    type: z.literal("link"),
    attrs: z.object({ href: z.string().min(1).max(2048).regex(SAFE_LINK) }),
  }),
]);

const textSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1).max(10_000),
  marks: z.array(markSchema).max(8).optional(),
});

const hardBreakSchema = z.object({ type: z.literal("hardBreak") });

const inlineSchema = z.union([textSchema, hardBreakSchema]);

const paragraphSchema = z.object({
  type: z.literal("paragraph"),
  content: z.array(inlineSchema).max(400).optional(),
});

const headingSchema = z.object({
  type: z.literal("heading"),
  attrs: z.object({ level: z.union([z.literal(2), z.literal(3)]) }),
  content: z.array(inlineSchema).max(200).optional(),
});

const listItemSchema = z.object({
  type: z.literal("listItem"),
  content: z.array(paragraphSchema).max(20),
});

const bulletListSchema = z.object({
  type: z.literal("bulletList"),
  content: z.array(listItemSchema).max(200),
});

const orderedListSchema = z.object({
  type: z.literal("orderedList"),
  content: z.array(listItemSchema).max(200),
});

const blockquoteSchema = z.object({
  type: z.literal("blockquote"),
  content: z.array(paragraphSchema).max(50),
});

const horizontalRuleSchema = z.object({ type: z.literal("horizontalRule") });

/** No `src`: the renderer resolves the media row. See the note above. */
const imageSchema = z.object({
  type: z.literal("image"),
  attrs: z.object({
    mediaId: z.string().min(1).max(36),
    alt: z.string().max(500).optional(),
  }),
});

const blockSchema = z.discriminatedUnion("type", [
  paragraphSchema,
  headingSchema,
  bulletListSchema,
  orderedListSchema,
  blockquoteSchema,
  horizontalRuleSchema,
  imageSchema,
]);

export const richDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(blockSchema).max(500),
});

export type RichDoc = z.infer<typeof richDocSchema>;
export type RichBlock = z.infer<typeof blockSchema>;
export type RichInline = z.infer<typeof inlineSchema>;
export type RichMark = z.infer<typeof markSchema>;

export const EMPTY_DOC: RichDoc = { type: "doc", content: [] };

// --- the rebuilder ---------------------------------------------------------

type Unknown = Record<string, unknown>;
const isObject = (v: unknown): v is Unknown => typeof v === "object" && v !== null;
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asString = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

function rebuildMarks(input: unknown): RichMark[] {
  const out: RichMark[] = [];
  for (const raw of asArray(input)) {
    if (!isObject(raw)) continue;
    if (raw.type === "bold") out.push({ type: "bold" });
    else if (raw.type === "italic") out.push({ type: "italic" });
    else if (raw.type === "link") {
      const href = isObject(raw.attrs) ? asString(raw.attrs.href) : undefined;
      // A href that is not on the safe list drops the MARK, not the text.
      if (href && SAFE_LINK.test(href)) out.push({ type: "link", attrs: { href } });
    }
  }
  return out.slice(0, 8);
}

function rebuildInline(input: unknown): RichInline[] {
  const out: RichInline[] = [];
  for (const raw of asArray(input)) {
    if (!isObject(raw)) continue;
    if (raw.type === "hardBreak") {
      out.push({ type: "hardBreak" });
      continue;
    }
    if (raw.type !== "text") continue;
    const text = asString(raw.text);
    if (!text) continue;
    const marks = rebuildMarks(raw.marks);
    out.push(marks.length > 0 ? { type: "text", text, marks } : { type: "text", text });
  }
  return out.slice(0, 400);
}

function rebuildParagraph(raw: Unknown): z.infer<typeof paragraphSchema> {
  const content = rebuildInline(raw.content);
  return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
}

function rebuildListItems(input: unknown): z.infer<typeof listItemSchema>[] {
  const out: z.infer<typeof listItemSchema>[] = [];
  for (const raw of asArray(input)) {
    if (!isObject(raw) || raw.type !== "listItem") continue;
    const paragraphs = asArray(raw.content)
      .filter(isObject)
      .filter((c) => c.type === "paragraph")
      .map(rebuildParagraph)
      .slice(0, 20);
    out.push({ type: "listItem", content: paragraphs });
  }
  return out.slice(0, 200);
}

function rebuildBlock(raw: unknown): RichBlock | null {
  if (!isObject(raw)) return null;

  switch (raw.type) {
    case "paragraph":
      return rebuildParagraph(raw);

    case "heading": {
      const level = isObject(raw.attrs) ? raw.attrs.level : undefined;
      // Anything outside the allowed levels becomes the smallest allowed one,
      // rather than letting an h1 compete with the page title.
      const safe = level === 3 ? 3 : 2;
      const content = rebuildInline(raw.content);
      return { type: "heading", attrs: { level: safe }, content };
    }

    case "bulletList":
      return { type: "bulletList", content: rebuildListItems(raw.content) };

    case "orderedList":
      return { type: "orderedList", content: rebuildListItems(raw.content) };

    case "blockquote":
      return {
        type: "blockquote",
        content: asArray(raw.content)
          .filter(isObject)
          .filter((c) => c.type === "paragraph")
          .map(rebuildParagraph)
          .slice(0, 50),
      };

    case "horizontalRule":
      return { type: "horizontalRule" };

    case "image": {
      const attrs = isObject(raw.attrs) ? raw.attrs : {};
      const mediaId = asString(attrs.mediaId);
      if (!mediaId) return null;
      const alt = asString(attrs.alt);
      return { type: "image", attrs: alt ? { mediaId, alt } : { mediaId } };
    }

    default:
      // Unknown node type: dropped. Never copied through "just in case".
      return null;
  }
}

/**
 * Rebuild an untrusted value into a document containing only whitelisted
 * shapes. Never throws — a hostile or malformed input yields an empty document.
 */
export function sanitizeDoc(input: unknown): RichDoc {
  if (!isObject(input) || input.type !== "doc") return EMPTY_DOC;

  const content: RichBlock[] = [];
  for (const raw of asArray(input.content).slice(0, 500)) {
    const block = rebuildBlock(raw);
    if (block) content.push(block);
  }

  const result = richDocSchema.safeParse({ type: "doc", content });
  // Belt and braces: if the rebuilder ever produces something the schema
  // rejects, store nothing rather than store the unexpected shape.
  return result.success ? result.data : EMPTY_DOC;
}

/** Every media id referenced by the document, for existence checking. */
export function referencedMediaIds(doc: RichDoc): string[] {
  return [...new Set(doc.content.filter((b) => b.type === "image").map((b) => b.attrs.mediaId))];
}

/** Plain text, for excerpts and search. */
export function docToText(doc: RichDoc): string {
  const parts: string[] = [];
  const walkInline = (nodes: RichInline[] | undefined) => {
    for (const n of nodes ?? []) if (n.type === "text") parts.push(n.text);
  };
  for (const block of doc.content) {
    if (block.type === "paragraph" || block.type === "heading") walkInline(block.content);
    else if (block.type === "blockquote") for (const p of block.content) walkInline(p.content);
    else if (block.type === "bulletList" || block.type === "orderedList") {
      for (const li of block.content) for (const p of li.content) walkInline(p.content);
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function isEmptyDoc(doc: RichDoc): boolean {
  return docToText(doc).length === 0 && !doc.content.some((b) => b.type === "image");
}
