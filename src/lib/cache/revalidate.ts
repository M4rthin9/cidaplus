import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Which public routes each kind of CMS write invalidates.
 *
 * Two things make this easy to get wrong, so they are stated once here rather
 * than remembered at each call site.
 *
 * First, a storefront route lives at `/[locale]/…`, and Next keys its cache
 * entry by the **route pattern**, not by the URL a visitor types.
 * `revalidatePath("/")` therefore does nothing for the homepage — measured in
 * phase 9, where a saved page sat in the database while `/` kept serving its
 * previous render. Every path below is a pattern, with `"page"` or `"layout"`
 * named explicitly.
 *
 * Second, the header and footer render the live category list, so a category
 * write has to invalidate the **layout**, not just the pages. A page-only
 * revalidation leaves the new category missing from the navigation on every
 * page that was already cached.
 *
 * Until this existed, publishing a product or a post invalidated nothing
 * public: the storefront corrected itself only when the 60-second ISR window
 * expired, and the sitemap not for an hour. An editor who pressed publish and
 * reloaded saw the old page and reasonably concluded the save had failed.
 */

/** The catalog: products, their listings, and anything that counts them. */
export function revalidateCatalog(): void {
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/products", "page");
  revalidatePath("/[locale]/product/[slug]", "page");
  revalidatePath("/[locale]/categories", "page");
  revalidatePath("/[locale]/category/[slug]", "page");
  revalidatePath("/[locale]/search", "page");
  revalidatePath("/sitemap.xml");
}

/**
 * Categories additionally reach the navigation, which lives in the layout —
 * the shipped default header menu carries the published categories as its
 * children (see site-header.tsx).
 */
export function revalidateCategories(): void {
  revalidateCatalog();
  revalidatePath("/[locale]", "layout");
}

/**
 * News and events share a table and both surface on the homepage, so a write to
 * either invalidates both sections. Distinguishing them here would save one
 * cache entry and risk missing the case where an editor changes a post's type.
 */
export function revalidatePosts(): void {
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/news", "page");
  revalidatePath("/[locale]/news/[slug]", "page");
  revalidatePath("/[locale]/events", "page");
  revalidatePath("/[locale]/events/[slug]", "page");
  revalidatePath("/[locale]/search", "page");
  revalidatePath("/sitemap.xml");
}
