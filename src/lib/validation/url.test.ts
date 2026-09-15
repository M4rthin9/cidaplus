import { describe, expect, it } from "vitest";
import { isSafeHttpUrl, optionalHttpUrl } from "./url";

const schema = optionalHttpUrl();

describe("isSafeHttpUrl", () => {
  it("accepts http and https", () => {
    expect(isSafeHttpUrl("https://www.facebook.com/cidapt")).toBe(true);
    expect(isSafeHttpUrl("http://example.test/path?a=1#b")).toBe(true);
  });

  it("rejects the script-bearing schemes z.url() lets through", () => {
    // Each of these parses as a URL, which is why z.url() alone is not enough.
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeHttpUrl("vbscript:msgbox(1)")).toBe(false);
  });

  it("rejects other non-web schemes", () => {
    expect(isSafeHttpUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeHttpUrl("ftp://example.test")).toBe(false);
  });

  it("is not fooled by leading whitespace or mixed case", () => {
    expect(isSafeHttpUrl("  javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("JaVaScRiPt:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("  https://example.test  ")).toBe(true);
  });

  it("rejects a relative path, since this guard is for absolute URLs", () => {
    expect(isSafeHttpUrl("/products")).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
  });
});

describe("optionalHttpUrl", () => {
  it("turns an empty string into undefined rather than storing it", () => {
    expect(schema.parse("")).toBeUndefined();
    expect(schema.parse("   ")).toBeUndefined();
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it("keeps a valid URL, trimmed", () => {
    expect(schema.parse(" https://example.test/a ")).toBe("https://example.test/a");
  });

  it("refuses an unsafe scheme with a Thai message", () => {
    const result = schema.safeParse("javascript:alert(1)");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/https/);
    }
  });

  it("enforces the length cap", () => {
    expect(optionalHttpUrl(30).safeParse(`https://example.test/${"a".repeat(64)}`).success).toBe(
      false,
    );
  });
});
