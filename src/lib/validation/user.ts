import { z } from "zod";

/**
 * One schema per entity, imported by both the form and the server action
 * (SPEC.md §13). Messages are Thai because every admin-facing string is
 * (CLAUDE.md) — these render inline next to the field, never as a bare toast.
 */

export const PASSWORD_MIN = 12;

const email = z
  .string()
  .trim()
  .min(1, "กรุณากรอกอีเมล")
  .max(255, "อีเมลยาวเกินไป")
  .pipe(z.email("รูปแบบอีเมลไม่ถูกต้อง"))
  .transform((v) => v.toLowerCase());

const password = z
  .string()
  .min(PASSWORD_MIN, `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN} ตัวอักษร`)
  .max(200, "รหัสผ่านยาวเกินไป");

const name = z.string().trim().min(1, "กรุณากรอกชื่อ").max(255, "ชื่อยาวเกินไป");

export const roleSchema = z.enum(["owner", "editor"], {
  message: "กรุณาเลือกสิทธิ์การใช้งาน",
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export const createUserSchema = z.object({
  email,
  name,
  password,
  role: roleSchema,
});

export const updateUserSchema = z.object({
  name,
  role: roleSchema,
  isActive: z.boolean(),
  /** Blank means "leave the password alone". */
  password: z.union([z.literal(""), password]).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/** Flatten a ZodError into { field: firstMessage } for inline rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
