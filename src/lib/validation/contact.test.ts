import { describe, expect, it } from "vitest";
import { contactSchema } from "./contact";

const valid = {
  name: "สมชาย ใจดี",
  email: "somchai@example.com",
  body: "สนใจสอบถามพวงหรีดแบ่งปันครับ",
};

describe("contactSchema", () => {
  it("accepts a minimal enquiry", () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it("maps an empty optional field to undefined, never to an empty string", () => {
    // The phase 4 bug: "" satisfying the first branch of a union and reaching
    // the database verbatim. `optional()` here preprocesses instead.
    const result = contactSchema.safeParse({ ...valid, phone: "  ", subject: "" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.phone).toBeUndefined();
    expect(result.data.subject).toBeUndefined();
  });

  it("rejects a body that is too short to act on", () => {
    const result = contactSchema.safeParse({ ...valid, body: "สนใจ" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toContain("อย่างน้อย");
  });

  it("rejects a malformed email with a Thai message", () => {
    const result = contactSchema.safeParse({ ...valid, email: "somchai" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toBe("รูปแบบอีเมลไม่ถูกต้อง");
  });

  it("trims the name rather than storing the padding", () => {
    const result = contactSchema.safeParse({ ...valid, name: "  สมชาย  " });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.name).toBe("สมชาย");
  });

  it("carries the honeypot through so the action can silently drop bots", () => {
    const result = contactSchema.safeParse({ ...valid, website: "http://spam.example" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.website).toBe("http://spam.example");
  });
});
