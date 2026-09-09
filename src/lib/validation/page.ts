import { z } from "zod";
import { MAX_SLUG_LENGTH } from "@/lib/slug";

/**
 * Page metadata. The section array is not here: it is a nested structure the
 * form submits as JSON and `sanitizeSections` rebuilds, which is the same
 * posture as the rich-text body (phase 5).
 */
const optional = (max: number, message: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max, message).optional(),
  );

export const pageSchema = z.object({
  /** Stable handle, never shown to a visitor. ASCII so it is safe in code paths. */
  key: z
    .string()
    .trim()
    .min(1, "กรุณากรอกรหัสหน้า")
    .max(64, "รหัสหน้ายาวเกินไป")
    .regex(/^[a-z0-9][a-z0-9-]*$/, "รหัสหน้าใช้ได้เฉพาะ a-z 0-9 และ -"),
  title: z.string().trim().min(1, "กรุณากรอกชื่อหน้า").max(255, "ชื่อหน้ายาวเกินไป"),
  slug: z.string().trim().min(1, "กรุณากรอก slug").max(MAX_SLUG_LENGTH, "slug ยาวเกินไป"),
  isPublished: z.boolean(),
  seoTitle: optional(255, "ชื่อ SEO ยาวเกินไป"),
  seoDescription: optional(500, "คำอธิบาย SEO ยาวเกินไป"),
});

export type PageInput = z.infer<typeof pageSchema>;

export type PageFormState = {
  message?: string;
  error?: string;
  errors?: Partial<Record<keyof PageInput, string>>;
};
