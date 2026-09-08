import { z } from "zod";

/**
 * The contact form contract, shared by the client form and the server action —
 * one schema, so an inline error the visitor sees is the same rule the server
 * enforces (CLAUDE.md).
 *
 * Messages are Thai because the storefront is Thai (§14 decision 9). When a
 * second locale ships these move into the message catalog; the field names and
 * limits do not change.
 */
const optional = (max: number, message: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max, message).optional(),
  );

export const contactSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อ-นามสกุล").max(255, "ชื่อยาวเกินไป"),
  email: z.email("รูปแบบอีเมลไม่ถูกต้อง").max(255, "อีเมลยาวเกินไป"),
  phone: optional(64, "เบอร์โทรศัพท์ยาวเกินไป"),
  subject: optional(255, "หัวข้อยาวเกินไป"),
  body: z
    .string()
    .trim()
    .min(10, "กรุณากรอกข้อความอย่างน้อย 10 ตัวอักษร")
    .max(5000, "ข้อความยาวเกินไป"),
  /**
   * A honeypot. Bots fill every field they find; a human never sees this one.
   * It is not a CAPTCHA and is not treated as one — the rate limiter is the
   * real control.
   */
  website: optional(255, ""),
});

export type ContactInput = z.infer<typeof contactSchema>;

export type ContactFieldErrors = Partial<Record<keyof ContactInput, string>>;

/**
 * What the visitor typed, echoed back on a rejected submission.
 *
 * React 19 resets an uncontrolled `<form action={…}>` once the action returns,
 * so without this a single mistyped email empties every field — on the one form
 * whose whole purpose is not to lose an enquiry. The action returns the raw
 * strings and the fields render them as `defaultValue`; the reset then restores
 * those rather than blanks.
 */
export type ContactValues = Partial<Record<Exclude<keyof ContactInput, "website">, string>>;

export type ContactFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: ContactFieldErrors;
  values?: ContactValues;
};
