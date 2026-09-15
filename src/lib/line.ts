/**
 * The one place a LINE URL is constructed. SPEC.md §8: "The URL lives in
 * `settings.line`. It must appear nowhere else in the codebase."
 *
 * §8 names the setting `settings.line.oa_url`, but a single URL cannot serve
 * both links this file builds — adding a friend and opening a chat with a
 * pre-filled message are different paths off the same handle. The handle is
 * stored instead (§14 decision 20) and both forms are derived here, so the
 * account still appears in exactly one place in the codebase.
 */

/** Stored as a handle rather than a URL — §14 decision 20. */
export function normaliseOaId(oaId: string): string {
  const trimmed = oaId.trim();
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

/**
 * The add-friend link. The `@` is percent-encoded because LINE's own published
 * form is `line.me/ti/p/%40handle`, and a bare `@` in a path is legal but
 * inconsistently handled by the chat clients that rewrite these links.
 */
export function addFriendUrl(oaId: string): string {
  const handle = normaliseOaId(oaId);
  return `https://line.me/ti/p/${encodeURIComponent(handle)}`;
}

/**
 * A chat with the account, carrying a pre-filled message (§8 item 3). This is
 * the "target link format supports it" case: `oaMessage` is LINE's own form for
 * opening a conversation with text already typed, which is what lets the
 * operator see which product the enquiry is about before replying.
 */
export function oaMessageUrl(oaId: string, message: string): string {
  const handle = normaliseOaId(oaId);
  return `https://line.me/R/oaMessage/${encodeURIComponent(handle)}/?${encodeURIComponent(message)}`;
}

/**
 * The placeholders `settings.line.message_template` understands.
 *
 * `product_sku` is optional because most of this catalog has no product code —
 * see `renderMessageTemplate` for what an absent value does to the line it sits
 * on.
 */
export type MessageVars = {
  product_name: string;
  product_url: string;
  product_sku?: string | null;
};

/**
 * Fill a message template.
 *
 * Three rules, each earning its place:
 *
 * 1. An **unknown** placeholder is left as written. An operator who typo'd
 *    `{product_nme}` should see their typo in the LINE chat and fix it, rather
 *    than silently send a message with a hole in it.
 *
 * 2. A **known but empty** placeholder — in practice `{product_sku}`, since
 *    most products here have no code — removes the whole line it sits on, but
 *    only when nothing else on that line was filled in. That is what turns
 *
 *        รหัสสินค้า: {product_sku}
 *
 *    into nothing at all instead of a dangling "รหัสสินค้า:" label. The guard
 *    matters: on a one-line template mixing the name and the SKU, dropping the
 *    line would take the product name with it, so there the SKU simply blanks.
 *
 * 3. Whitespace is then tidied — runs of spaces collapsed, lines trimmed,
 *    blank runs reduced — because a removed placeholder otherwise leaves the
 *    seams visible in the message the customer actually sends.
 *
 * Nothing here escapes anything: the result is a plain string, and
 * `oaMessageUrl` percent-encodes it exactly once on the way into the URL.
 */
export function renderMessageTemplate(template: string, vars: MessageVars): string {
  const lines = template.split(/\r?\n/).map((line) => {
    let sawEmpty = false;
    let sawFilled = false;

    const rendered = line.replace(/\{(\w+)\}/g, (match, key: string) => {
      if (!(key in vars)) return match;
      const value = vars[key as keyof MessageVars];
      if (value === undefined || value === null || value.trim() === "") {
        sawEmpty = true;
        return "";
      }
      sawFilled = true;
      return value;
    });

    if (sawEmpty && !sawFilled) return null;
    return rendered.replace(/[^\S\n]{2,}/g, " ").trim();
  });

  return lines
    .filter((line): line is string => line !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * The tracked entry point. Every product CTA points here rather than at LINE
 * directly, so the click is recorded and the message is resolved on the server
 * — a template rendered in the browser would be one more place the account and
 * the copy could drift from `settings.line`.
 */
export function goLinePath(productSlug?: string): string {
  return productSlug ? `/go/line?p=${encodeURIComponent(productSlug)}` : "/go/line";
}
