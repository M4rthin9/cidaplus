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

/** The placeholders §8 defines for `settings.line.message_template`. */
export type MessageVars = {
  product_name: string;
  product_url: string;
};

/**
 * Fill a message template. Unknown placeholders are left as written rather than
 * blanked: an operator who typo'd `{product_nme}` should see their typo in the
 * LINE chat and fix it, not silently send a message with a hole in it.
 */
export function renderMessageTemplate(template: string, vars: MessageVars): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? vars[key as keyof MessageVars] : match,
  );
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
