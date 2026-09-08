import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, categoryI18n, locales, media, mediaI18n, productI18n } from "@/db/schema";
import { DEFAULT_LOCALE } from "@/lib/slug";

/** Shared reads for the catalog admin. Kept out of the pages so both editors agree. */

export function categoryOptions() {
  return db
    .select({ id: categories.id, name: categoryI18n.name })
    .from(categories)
    .innerJoin(
      categoryI18n,
      and(eq(categoryI18n.categoryId, categories.id), eq(categoryI18n.locale, DEFAULT_LOCALE)),
    )
    .where(isNull(categories.deletedAt))
    .orderBy(asc(categories.sortOrder));
}

export async function mediaPickerItems() {
  return db
    .select({
      id: media.id,
      storageKey: media.storageKey,
      filename: media.filename,
      blurhash: media.blurhash,
      focalX: media.focalX,
      focalY: media.focalY,
      alt: mediaI18n.alt,
    })
    .from(media)
    .leftJoin(mediaI18n, and(eq(mediaI18n.mediaId, media.id), eq(mediaI18n.locale, DEFAULT_LOCALE)))
    .where(isNull(media.deletedAt))
    .orderBy(asc(media.createdAt))
    .limit(200);
}

/**
 * Locale tabs for the editor (§9). Shows a dot when that locale has no row for
 * the entity. v1 enables Thai only, so this normally renders one tab.
 */
export async function localeTabs(
  table: "product" | "post",
  entityId: string | null,
): Promise<{ code: string; label: string; enabled: boolean; complete: boolean }[]> {
  const all = await db.select().from(locales).orderBy(asc(locales.sortOrder));

  const present = new Set<string>();
  if (entityId && table === "product") {
    const rows = await db
      .select({ locale: productI18n.locale })
      .from(productI18n)
      .where(eq(productI18n.productId, entityId));
    for (const r of rows) present.add(r.locale);
  }

  return all.map((l) => ({
    code: l.code,
    label: l.labelNative,
    enabled: l.isEnabled,
    complete: entityId ? present.has(l.code) : l.code === DEFAULT_LOCALE,
  }));
}

export async function productCount(categoryId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(categories)
    .where(eq(categories.id, categoryId));
  return row?.n ?? 0;
}
