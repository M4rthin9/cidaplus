/**
 * Scheme safety for operator-supplied absolute URLs.
 *
 * `z.url()` only asks whether the string parses as a URL, and `javascript:`,
 * `data:` and `vbscript:` all parse. Every value validated with it here reaches
 * an `href` or an iframe `src` on the public site (the footer's social links,
 * the contact page's map embed, an event's registration link), so a bare
 * `z.url()` would let an editor store XSS that every visitor is one click away
 * from — with an audit-log row saying it was done on purpose.
 *
 * The rich-text whitelist, the menu builder and the section builder each
 * already refuse unsafe schemes. This is the same rule for the remaining
 * operator-typed URLs.
 */
import { z } from "zod";

/** The only schemes an operator-supplied absolute URL may use. */
const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

export function isSafeHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }
  return SAFE_PROTOCOLS.has(parsed.protocol);
}

export const URL_SCHEME_MESSAGE = "ต้องเป็นลิงก์ที่ขึ้นต้นด้วย https://";

/**
 * An absolute http(s) URL. Empty string is stripped before validation for the
 * reason recorded in validation/catalog.ts: `""` reaching a nullable column is
 * an empty string, not a NULL.
 */
export function optionalHttpUrl(max = 2048) {
  return z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).refine(isSafeHttpUrl, { message: URL_SCHEME_MESSAGE }).optional(),
  );
}
