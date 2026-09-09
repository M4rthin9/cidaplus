import { z } from "zod";
import { MAX_SLUG_LENGTH } from "@/lib/slug";

/**
 * Shared by the forms and the server actions (SPEC.md §13). Thai messages,
 * rendered inline next to the field (§9).
 */

const slug = z
  .string()
  .trim()
  .max(MAX_SLUG_LENGTH, `ลิงก์ยาวเกิน ${MAX_SLUG_LENGTH} ตัวอักษร`)
  // Thai UTF-8 slugs (§14 decision 17): Thai letters, ASCII alphanumerics, hyphens.
  .regex(/^[a-z0-9฀-๿-]*$/, "ลิงก์ใช้ได้เฉพาะตัวอักษรไทย ตัวอักษรอังกฤษพิมพ์เล็ก ตัวเลข และขีดกลาง")
  .refine(
    (v) => !v.startsWith("-") && !v.endsWith("-"),
    "ลิงก์ต้องไม่ขึ้นต้นหรือลงท้ายด้วยขีดกลาง",
  );

const name = z.string().trim().min(1, "กรุณากรอกชื่อ").max(255, "ชื่อยาวเกินไป");

/**
 * An empty form field means "not set", and must reach the database as NULL.
 *
 * `z.string().optional().or(z.literal("").transform(...))` does NOT do this: ""
 * satisfies the first branch, so the union never reaches the transform and the
 * empty string is written verbatim — which for a foreign key is a constraint
 * violation, not a null. Preprocess instead, so "" is gone before validation.
 */
function optionalString(max: number, message = "ข้อความยาวเกินไป") {
  return z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max, message).optional(),
  );
}

const optionalText = optionalString(2000);

export const publishStateSchema = z.enum(["draft", "scheduled", "published"], {
  message: "กรุณาเลือกสถานะ",
});
export type PublishState = z.infer<typeof publishStateSchema>;

/** §9: draft / scheduled / published, backed by is_published + published_at. */
export function toPublishColumns(state: PublishState, publishedAt: Date | null) {
  if (state === "draft") return { isPublished: false, publishedAt: null };
  if (state === "scheduled") return { isPublished: true, publishedAt };
  return { isPublished: true, publishedAt: publishedAt ?? new Date() };
}

export function fromPublishColumns(
  isPublished: boolean,
  publishedAt: Date | null,
  now: Date = new Date(),
): PublishState {
  if (!isPublished) return "draft";
  if (publishedAt && publishedAt.getTime() > now.getTime()) return "scheduled";
  return "published";
}

const publishFields = {
  publishState: publishStateSchema,
  /** Only meaningful when scheduled; a datetime-local string. */
  publishedAt: optionalString(40),
};

export const categorySchema = z
  .object({
    name,
    slug,
    description: optionalText,
    parentId: optionalString(64),
    isPublished: z.boolean(),
    heroMediaId: optionalString(64),
  })
  .strict();

export type CategoryInput = z.infer<typeof categorySchema>;

export const priceDisplaySchema = z.enum(["exact", "from", "contact", "hidden"], {
  message: "กรุณาเลือกรูปแบบการแสดงราคา",
});

export const productSchema = z
  .object({
    name,
    slug,
    shortDesc: optionalText,
    categoryId: z.string().trim().min(1, "กรุณาเลือกหมวดหมู่"),
    priceDisplay: priceDisplaySchema,
    price: optionalString(20).refine(
      (v) => v === undefined || /^\d+(\.\d{1,2})?$/.test(v),
      "ราคาต้องเป็นตัวเลข",
    ),
    sku: optionalString(64, "รหัสสินค้ายาวเกินไป"),
    /**
     * Overrides `settings.line.messageTemplate` for this product alone
     * (SPEC.md §8 item 3). Same placeholders; empty means "use the site default",
     * which is why it goes through optionalString rather than being stored as "".
     */
    lineMessageOverride: optionalString(500, "ข้อความยาวเกินไป"),
    isFeatured: z.boolean(),
    mediaIds: z.array(z.string()).max(20, "เลือกรูปได้ไม่เกิน 20 รูป").default([]),
    ...publishFields,
  })
  .strict()
  .refine((v) => v.priceDisplay !== "exact" || Boolean(v.price), {
    message: "กรุณากรอกราคา หรือเปลี่ยนรูปแบบการแสดงราคา",
    path: ["price"],
  })
  .refine((v) => v.publishState !== "scheduled" || Boolean(v.publishedAt), {
    message: "กรุณาเลือกวันและเวลาที่จะเผยแพร่",
    path: ["publishedAt"],
  });

export type ProductInput = z.infer<typeof productSchema>;

export const bulkActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "กรุณาเลือกสินค้าอย่างน้อยหนึ่งรายการ"),
  action: z.enum(["publish", "unpublish", "move", "delete"], { message: "การกระทำไม่ถูกต้อง" }),
  categoryId: z.string().trim().optional(),
});

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});
