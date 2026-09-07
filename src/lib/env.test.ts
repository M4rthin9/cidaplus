import { describe, expect, it, beforeEach } from "vitest";
import { assertEnv, hasSmtp, parseEnv, resetEnvCache } from "./env";

const valid = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://cida:cida@localhost:5432/cida",
  AUTH_SECRET: "0123456789abcdef0123456789abcdef",
  AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  MEDIA_DIR: "/data/media",
  LINE_OA_URL: "https://line.me/ti/p/%40355kxfoj",
} satisfies Record<string, string>;

beforeEach(() => resetEnvCache());

describe("parseEnv", () => {
  it("accepts a complete environment", () => {
    const result = parseEnv(valid);
    expect(result.ok).toBe(true);
  });

  it("boots with every SMTP_* variable unset — SPEC.md §9", () => {
    const result = parseEnv(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(hasSmtp(result.env)).toBe(false);
  });

  it("treats empty strings as unset rather than as values", () => {
    const result = parseEnv({ ...valid, SMTP_HOST: "", CLOUDFLARE_API_TOKEN: "" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.env.SMTP_HOST).toBeUndefined();
  });

  it("reports every missing required variable at once, not just the first", () => {
    const result = parseEnv({ NODE_ENV: "test" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.length).toBeGreaterThanOrEqual(6);
    expect(result.issues.join("\n")).toContain("DATABASE_URL");
    expect(result.issues.join("\n")).toContain("LINE_OA_URL");
  });

  it("rejects a short AUTH_SECRET", () => {
    const result = parseEnv({ ...valid, AUTH_SECRET: "too-short" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.join("\n")).toContain("AUTH_SECRET");
  });

  it("rejects a non-absolute site URL", () => {
    const result = parseEnv({ ...valid, NEXT_PUBLIC_SITE_URL: "cidapt.com" });
    expect(result.ok).toBe(false);
  });

  it("recognises a fully configured SMTP block", () => {
    const result = parseEnv({
      ...valid,
      SMTP_HOST: "mailpit",
      SMTP_PORT: "1025",
      SMTP_FROM: "noreply@cidapt.com",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.env.SMTP_PORT).toBe(1025);
    expect(hasSmtp(result.env)).toBe(true);
  });
});

describe("assertEnv", () => {
  it("throws a readable, multi-line error listing each problem", () => {
    expect(() => assertEnv({ NODE_ENV: "test" })).toThrowError(/Invalid environment/);
    expect(() => assertEnv({ NODE_ENV: "test" })).toThrowError(/DATABASE_URL/);
  });

  it("memoises a valid parse", () => {
    expect(assertEnv(valid)).toBe(assertEnv(valid));
  });
});
