/**
 * The one place a LINE URL is constructed. SPEC.md §8: "The URL lives in
 * `settings.line`. It must appear nowhere else in the codebase."
 *
 * Only the add-friend form lives here. The message-carrying link, the
 * `/go/line` redirect and click tracking are phase 8 — they belong together,
 * because the template, the per-product override and the `line_clicks` row are
 * one feature. This function exists now so the header, footer and contact page
 * have a working LINE entry point without a second copy of the URL appearing
 * when phase 8 lands.
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
