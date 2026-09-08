import { z } from "zod";
import { richDocSchema, sanitizeDoc, type RichDoc } from "@/lib/richtext/schema";

/**
 * Homepage / page section blocks. SPEC.md §6, "Homepage section builder".
 *
 * `page_i18n.sections` is an ordered array of discriminated-union blocks. Each
 * type has its own schema here and its own renderer in
 * `src/components/sections/`.
 *
 * Like the rich-text whitelist (phase 5), parsing **rebuilds** rather than
 * filters: an unrecognised block type is dropped rather than carried through,
 * so a shape nobody anticipated cannot survive by going unnoticed. §6 requires
 * unknown types to render as nothing in production and as a warning in the
 * admin — the admin gets that by parsing leniently and keeping the raw type
 * around, which `parseSectionsForEditing` does.
 */

const id = z.string().trim().min(1).max(64);
const text = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional(),
  );
const required = (max: number, message: string) => z.string().trim().min(1, message).max(max);
const mediaId = z.string().trim().max(36);

/**
 * A link target an operator can type. Internal paths and https only — a
 * `javascript:` href in a CTA would be stored XSS with an audit trail.
 */
export const linkHref = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v.startsWith("/") || /^https:\/\//i.test(v), {
    message: "ลิงก์ต้องขึ้นต้นด้วย / หรือ https://",
  });

const base = { id, isVisible: z.boolean().default(true) };

const heroBlock = z.object({
  ...base,
  type: z.literal("hero"),
  headline: text(255),
  body: text(1000),
  ctaLabel: text(80),
  ctaHref: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    linkHref.optional(),
  ),
  mediaId: text(36),
  showSeal: z.boolean().default(true),
});

const valuePropsBlock = z.object({
  ...base,
  type: z.literal("value_props"),
  title: text(255),
  items: z
    .array(z.object({ text: required(160, "กรุณากรอกข้อความ") }))
    .max(8)
    .default([]),
});

const featuredProductsBlock = z.object({
  ...base,
  type: z.literal("featured_products"),
  title: text(255),
  limit: z.coerce.number().int().min(1).max(24).default(8),
  categoryId: text(36),
});

const categoryShowcaseBlock = z.object({
  ...base,
  type: z.literal("category_showcase"),
  title: text(255),
  /** Empty means every published top-level category, in their own order. */
  categoryIds: z.array(mediaId).max(12).default([]),
});

const whyUsGridBlock = z.object({
  ...base,
  type: z.literal("why_us_grid"),
  title: text(255),
  items: z
    .array(
      z.object({
        heading: required(120, "กรุณากรอกหัวข้อ"),
        body: text(500),
      }),
    )
    .max(8)
    .default([]),
});

const richTextBlock = z.object({
  ...base,
  type: z.literal("rich_text"),
  title: text(255),
  body: richDocSchema,
});

const imageBannerBlock = z.object({
  ...base,
  type: z.literal("image_banner"),
  mediaId: text(36),
  headline: text(255),
  body: text(1000),
  ctaLabel: text(80),
  ctaHref: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    linkHref.optional(),
  ),
});

const latestPostsBlock = z.object({
  ...base,
  type: z.literal("latest_posts"),
  title: text(255),
  limit: z.coerce.number().int().min(1).max(12).default(3),
  postType: z.enum(["all", "news", "event"]).default("all"),
});

const galleryStripBlock = z.object({
  ...base,
  type: z.literal("gallery_strip"),
  title: text(255),
  mediaIds: z.array(mediaId).max(24).default([]),
});

const ctaLineBlock = z.object({
  ...base,
  type: z.literal("cta_line"),
  headline: text(255),
  body: text(500),
});

const faqAccordionBlock = z.object({
  ...base,
  type: z.literal("faq_accordion"),
  title: text(255),
  items: z
    .array(
      z.object({
        question: required(255, "กรุณากรอกคำถาม"),
        answer: required(2000, "กรุณากรอกคำตอบ"),
      }),
    )
    .max(20)
    .default([]),
});

export const sectionSchema = z.discriminatedUnion("type", [
  heroBlock,
  valuePropsBlock,
  featuredProductsBlock,
  categoryShowcaseBlock,
  whyUsGridBlock,
  richTextBlock,
  imageBannerBlock,
  latestPostsBlock,
  galleryStripBlock,
  ctaLineBlock,
  faqAccordionBlock,
]);

export const sectionsSchema = z.array(sectionSchema).max(40);

export type Section = z.infer<typeof sectionSchema>;
export type SectionType = Section["type"];
export type SectionsValue = Section[];

/** Thai labels and one-line descriptions for the "add a block" menu (§9). */
export const SECTION_META: Record<SectionType, { label: string; hint: string }> = {
  hero: { label: "ส่วนหัวเรื่อง", hint: "ชื่อหน่วยงาน ข้อความนำ และปุ่มหลัก" },
  value_props: { label: "จุดเด่น", hint: "รายการข้อความสั้นพร้อมเครื่องหมายถูก" },
  featured_products: { label: "สินค้าแนะนำ", hint: "ดึงสินค้าที่ตั้งเป็นแนะนำมาแสดงเป็นตาราง" },
  category_showcase: { label: "แถบหมวดหมู่", hint: "หนึ่งแถบต่อหนึ่งหมวดหมู่ สลับซ้ายขวา" },
  why_us_grid: { label: "เหตุผลที่เลือกเรา", hint: "หัวข้อและคำอธิบายแบบตาราง" },
  rich_text: { label: "ข้อความอิสระ", hint: "ย่อหน้า หัวข้อ รายการ และรูปจากคลังภาพ" },
  image_banner: { label: "แบนเนอร์ภาพ", hint: "ภาพเต็มความกว้างพร้อมข้อความทับ" },
  latest_posts: { label: "ข่าวและกิจกรรมล่าสุด", hint: "ดึงข่าวล่าสุดมาแสดงอัตโนมัติ" },
  gallery_strip: { label: "แถบภาพ", hint: "ภาพหลายรูปเรียงแนวนอน" },
  cta_line: { label: "แถบติดต่อ LINE", hint: "ข้อความชวนติดต่อพร้อมปุ่ม LINE" },
  faq_accordion: { label: "คำถามที่พบบ่อย", hint: "คำถามและคำตอบแบบพับเก็บได้" },
};

export const SECTION_TYPES = Object.keys(SECTION_META) as SectionType[];

/**
 * Rebuild the stored array against the schema, dropping anything that does not
 * parse. Used on write and on public read, so a row written by an older version
 * of the app cannot take a page down.
 */
export function sanitizeSections(input: unknown): SectionsValue {
  if (!Array.isArray(input)) return [];

  const out: SectionsValue = [];
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) continue;

    // Rich text goes through the phase-5 sanitizer first: the section schema
    // only checks the document's shape, and that whitelist is what decides
    // which nodes, marks and attributes may exist at all.
    const candidate =
      (raw as { type?: unknown }).type === "rich_text"
        ? { ...raw, body: sanitizeDoc((raw as { body?: unknown }).body) }
        : raw;

    const result = sectionSchema.safeParse(candidate);
    if (result.success) out.push(result.data);
  }
  return out.slice(0, 40);
}

export type EditableSection =
  | { ok: true; section: Section }
  /** Kept so the admin can warn about it rather than silently discarding work. */
  | { ok: false; id: string; type: string };

/**
 * The admin's read. §6: "Unknown block types render as nothing in production
 * and as a warning in the admin" — which is only possible if the editor can see
 * that something was there.
 */
export function parseSectionsForEditing(input: unknown): EditableSection[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((raw, index): EditableSection[] => {
    if (typeof raw !== "object" || raw === null) return [];
    const record = raw as Record<string, unknown>;
    const candidate =
      record.type === "rich_text" ? { ...record, body: sanitizeDoc(record.body) } : record;

    const result = sectionSchema.safeParse(candidate);
    if (result.success) return [{ ok: true, section: result.data }];

    return [
      {
        ok: false,
        id: typeof record.id === "string" ? record.id : `unknown-${index}`,
        type: typeof record.type === "string" ? record.type : "(ไม่ทราบชนิด)",
      },
    ];
  });
}

/** A new block of each type, with the fields the renderer needs already present. */
export function emptySection(type: SectionType, id: string): Section {
  const common = { id, isVisible: true };
  switch (type) {
    case "hero":
      return { ...common, type, showSeal: true };
    case "value_props":
      return { ...common, type, items: [] };
    case "featured_products":
      return { ...common, type, limit: 8 };
    case "category_showcase":
      return { ...common, type, categoryIds: [] };
    case "why_us_grid":
      return { ...common, type, items: [] };
    case "rich_text":
      return { ...common, type, body: { type: "doc", content: [] } as RichDoc };
    case "image_banner":
      return { ...common, type };
    case "latest_posts":
      return { ...common, type, limit: 3, postType: "all" };
    case "gallery_strip":
      return { ...common, type, mediaIds: [] };
    case "cta_line":
      return { ...common, type };
    case "faq_accordion":
      return { ...common, type, items: [] };
  }
}
