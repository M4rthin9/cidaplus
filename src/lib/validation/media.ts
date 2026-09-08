import { z } from "zod";

/** One schema per entity, shared by the form and the server action (SPEC.md §13). */

export const altSchema = z
  .string()
  .trim()
  .min(1, "กรุณากรอกคำอธิบายภาพ (alt) ภาษาไทย")
  .max(500, "คำอธิบายภาพยาวเกินไป");

export const tagsSchema = z
  .string()
  .trim()
  .transform((v) =>
    v
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 20),
  );

export const updateMediaSchema = z.object({
  alt: altSchema,
  tags: tagsSchema,
  focalX: z.coerce.number().int().min(0).max(100),
  focalY: z.coerce.number().int().min(0).max(100),
});

export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;
