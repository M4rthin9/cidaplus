import { z } from "zod";
import { MAX_SLUG_LENGTH } from "@/lib/slug";

/** Shared by the post form and the post actions (SPEC.md §13). Thai messages. */

function optionalString(max: number, message = "ข้อความยาวเกินไป") {
  // See the note in validation/catalog.ts: "" must be gone BEFORE validation,
  // or it reaches the database as an empty string rather than as NULL.
  return z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max, message).optional(),
  );
}

export const postTypeSchema = z.enum(["news", "event"], { message: "กรุณาเลือกประเภท" });

export const postSchema = z
  .object({
    type: postTypeSchema,
    title: z.string().trim().min(1, "กรุณากรอกหัวข้อ").max(255, "หัวข้อยาวเกินไป"),
    slug: z
      .string()
      .trim()
      .max(MAX_SLUG_LENGTH, `ลิงก์ยาวเกิน ${MAX_SLUG_LENGTH} ตัวอักษร`)
      .regex(
        /^[a-z0-9฀-๿-]*$/,
        "ลิงก์ใช้ได้เฉพาะตัวอักษรไทย ตัวอักษรอังกฤษพิมพ์เล็ก ตัวเลข และขีดกลาง",
      )
      .refine(
        (v) => !v.startsWith("-") && !v.endsWith("-"),
        "ลิงก์ต้องไม่ขึ้นต้นหรือลงท้ายด้วยขีดกลาง",
      ),
    excerpt: optionalString(500),
    /** Tiptap JSON as a string; rebuilt against the whitelist server-side. */
    body: z.string().max(500_000, "เนื้อหายาวเกินไป").optional(),
    coverMediaId: optionalString(36),
    publishState: z.enum(["draft", "scheduled", "published"], { message: "กรุณาเลือกสถานะ" }),
    publishedAt: optionalString(40),
    eventStartAt: optionalString(40),
    eventEndAt: optionalString(40),
    eventLocation: optionalString(255),
  })
  .refine((v) => v.publishState !== "scheduled" || Boolean(v.publishedAt), {
    message: "กรุณาเลือกวันและเวลาที่จะเผยแพร่",
    path: ["publishedAt"],
  })
  .refine((v) => v.type !== "event" || Boolean(v.eventStartAt), {
    message: "กิจกรรมต้องระบุวันที่เริ่ม",
    path: ["eventStartAt"],
  })
  .refine(
    (v) =>
      !v.eventStartAt ||
      !v.eventEndAt ||
      new Date(v.eventEndAt).getTime() >= new Date(v.eventStartAt).getTime(),
    { message: "วันสิ้นสุดต้องไม่มาก่อนวันเริ่ม", path: ["eventEndAt"] },
  );

export type PostInput = z.infer<typeof postSchema>;
