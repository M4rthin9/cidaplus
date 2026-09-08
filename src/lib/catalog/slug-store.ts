import "server-only";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { categoryI18n, productI18n, redirects } from "@/db/schema";
import { categoryPath, productPath, uniqueSlug } from "@/lib/slug";

/**
 * Slug persistence: uniqueness within a locale, and the 301 row that §9 requires
 * whenever a *published* slug changes.
 *
 * Uniqueness is enforced by a unique index on (locale, slug); this pre-check
 * exists so the operator sees an inline Thai message instead of a constraint
 * error, not as the guarantee.
 */

export async function categorySlugTaken(
  locale: string,
  slug: string,
  exceptCategoryId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: categoryI18n.categoryId })
    .from(categoryI18n)
    .where(
      exceptCategoryId
        ? and(
            eq(categoryI18n.locale, locale),
            eq(categoryI18n.slug, slug),
            ne(categoryI18n.categoryId, exceptCategoryId),
          )
        : and(eq(categoryI18n.locale, locale), eq(categoryI18n.slug, slug)),
    )
    .limit(1);
  return rows.length > 0;
}

export async function productSlugTaken(
  locale: string,
  slug: string,
  exceptProductId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: productI18n.productId })
    .from(productI18n)
    .where(
      exceptProductId
        ? and(
            eq(productI18n.locale, locale),
            eq(productI18n.slug, slug),
            ne(productI18n.productId, exceptProductId),
          )
        : and(eq(productI18n.locale, locale), eq(productI18n.slug, slug)),
    )
    .limit(1);
  return rows.length > 0;
}

export function freeCategorySlug(locale: string, base: string, exceptId?: string) {
  return uniqueSlug(base, (c) => categorySlugTaken(locale, c, exceptId));
}

export function freeProductSlug(locale: string, base: string, exceptId?: string) {
  return uniqueSlug(base, (c) => productSlugTaken(locale, c, exceptId));
}

type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

/**
 * Write the 301 for a changed slug (§9).
 *
 * Only for entities that were already published — an unpublished draft has no
 * public URL, so a redirect from it would be noise. Re-pointing an existing row
 * keeps a rename chain (a -> b -> c) resolving in one hop rather than a chain
 * that Google will not follow far.
 */
export async function recordSlugRedirect(
  exec: Executor,
  kind: "product" | "category",
  locale: string,
  oldSlug: string,
  newSlug: string,
): Promise<void> {
  if (oldSlug === newSlug) return;

  const build = kind === "product" ? productPath : categoryPath;
  const from = build(locale, oldSlug);
  const to = build(locale, newSlug);
  if (from === to) return;

  await exec
    .insert(redirects)
    .values({ fromPath: from, toPath: to, locale })
    .onConflictDoUpdate({ target: redirects.fromPath, set: { toPath: to } });

  // Anything that used to point at the old path now points at the new one, so
  // an earlier rename does not become a two-hop chain.
  await exec.update(redirects).set({ toPath: to }).where(eq(redirects.toPath, from));

  // A redirect to itself would be a loop; drop it if the slug came back around.
  await exec.delete(redirects).where(eq(redirects.fromPath, to));
}
