import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("produces an argon2id digest — SPEC.md §3 says Argon2id, not argon2i or argon2d", async () => {
    const digest = await hashPassword("correct horse battery staple");
    expect(digest.startsWith("$argon2id$")).toBe(true);
  });

  it("verifies the right password and rejects the wrong one", async () => {
    const digest = await hashPassword("รหัสผ่านภาษาไทยยาวพอ");
    expect(await verifyPassword(digest, "รหัสผ่านภาษาไทยยาวพอ")).toBe(true);
    expect(await verifyPassword(digest, "ผิด")).toBe(false);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("same-password-here");
    const b = await hashPassword("same-password-here");
    expect(a).not.toBe(b);
    expect(await verifyPassword(a, "same-password-here")).toBe(true);
    expect(await verifyPassword(b, "same-password-here")).toBe(true);
  });

  it("returns false rather than throwing on a malformed digest", async () => {
    expect(await verifyPassword("not-a-digest", "anything")).toBe(false);
    expect(await verifyPassword("", "anything")).toBe(false);
  });
});
