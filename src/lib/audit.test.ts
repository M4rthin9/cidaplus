import { describe, expect, it } from "vitest";
import { REDACTED, diffFields } from "./audit";

describe("diffFields", () => {
  it("records only the fields that changed", () => {
    const diff = diffFields({ name: "สมชาย", role: "editor" }, { name: "สมหญิง", role: "editor" });
    expect(Object.keys(diff)).toEqual(["name"]);
    expect(diff.name).toEqual({ from: "สมชาย", to: "สมหญิง" });
  });

  it("never records a password hash, in either direction", () => {
    const diff = diffFields({ passwordHash: "$argon2id$old" }, { passwordHash: "$argon2id$new" });
    expect(diff.passwordHash).toEqual({ from: REDACTED, to: REDACTED });
    expect(JSON.stringify(diff)).not.toContain("argon2");
  });

  it("still records THAT a password changed, so rotation is auditable", () => {
    const diff = diffFields({ passwordHash: "a" }, { passwordHash: "b" });
    expect(diff).toHaveProperty("passwordHash");
  });

  it("redacts sessionVersion, which is a revocation detail not a content change", () => {
    const diff = diffFields({ sessionVersion: 1 }, { sessionVersion: 2 });
    expect(diff.sessionVersion).toEqual({ from: REDACTED, to: REDACTED });
  });

  it("treats a creation as every field going from null", () => {
    const diff = diffFields(null, { name: "สมชาย", isActive: true });
    expect(diff.name).toEqual({ from: null, to: "สมชาย" });
    expect(diff.isActive).toEqual({ from: null, to: true });
  });

  it("normalises dates so an unchanged timestamp is not a spurious diff", () => {
    const d1 = new Date("2026-09-07T00:00:00Z");
    const d2 = new Date("2026-09-07T00:00:00Z");
    expect(diffFields({ at: d1 }, { at: d2 })).toEqual({});
  });

  it("treats undefined and null as the same absence", () => {
    expect(diffFields({ x: undefined }, { x: null })).toEqual({});
  });

  it("returns an empty diff for identical records", () => {
    expect(diffFields({ a: 1, b: "x" }, { a: 1, b: "x" })).toEqual({});
  });
});
