import "server-only";

import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  categories,
  categoryI18n,
  pageI18n,
  pages,
  postI18n,
  posts,
  productI18n,
  products,
} from "@/db/schema";
import type { LocalePaths } from "./alternates";

/**
 * Everything published, with each entity's slug in every locale that has one.
 *
 * The sitemap needs the whole set at once, not per-locale queries: an entry's
 * hreflang alternates are the *other* locales' URLs for the same entity, so one
 * pass produces both the entries and their cross-references and they cannot
 * disagree.
 */
export type SitemapEntity = {
  paths: LocalePaths;
  lastModified: Date;
};

const live = {
  product: and(
    eq(products.isPublished, true),
    lte(products.publishedAt, sql`now()`),
    isNull(products.deletedAt),
  ),
  post: and(
    eq(posts.isPublished, true),
    lte(posts.publishedAt, sql`now()`),
    isNull(posts.deletedAt),
  ),
  category: and(eq(categories.isPublished, true), isNull(categories.deletedAt)),
};

function group(
  rows: { id: string; locale: string; slug: string; updatedAt: Date | null }[],
  prefix: string,
): SitemapEntity[] {
  const byId = new Map<string, SitemapEntity>();

  for (const row of rows) {
    const existing = byId.get(row.id) ?? { paths: {}, lastModified: new Date(0) };
    existing.paths[row.locale] = `${prefix}/${row.slug}`;
    const stamp = row.updatedAt ?? new Date(0);
    if (stamp > existing.lastModified) existing.lastModified = stamp;
    byId.set(row.id, existing);
  }

  return [...byId.values()];
}

export async function publishedProductEntities(): Promise<SitemapEntity[]> {
  const rows = await db
    .select({
      id: products.id,
      locale: productI18n.locale,
      slug: productI18n.slug,
      updatedAt: productI18n.updatedAt,
    })
    .from(products)
    .innerJoin(productI18n, eq(productI18n.productId, products.id))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(live.product, live.category));

  return group(rows, "/product");
}

export async function publishedCategoryEntities(): Promise<SitemapEntity[]> {
  const rows = await db
    .select({
      id: categories.id,
      locale: categoryI18n.locale,
      slug: categoryI18n.slug,
      updatedAt: categoryI18n.updatedAt,
    })
    .from(categories)
    .innerJoin(categoryI18n, eq(categoryI18n.categoryId, categories.id))
    .where(live.category);

  return group(rows, "/category");
}

export async function publishedPostEntities(): Promise<SitemapEntity[]> {
  const rows = await db
    .select({
      id: posts.id,
      locale: postI18n.locale,
      slug: postI18n.slug,
      updatedAt: postI18n.updatedAt,
    })
    .from(posts)
    .innerJoin(postI18n, eq(postI18n.postId, posts.id))
    .where(live.post);

  return group(rows, "/news");
}

/** CMS pages, excluding the homepage — it has its own entry at `/`. */
export async function publishedPageEntities(homeKey: string): Promise<SitemapEntity[]> {
  const rows = await db
    .select({
      id: pages.id,
      key: pages.key,
      locale: pageI18n.locale,
      slug: pageI18n.slug,
      updatedAt: pageI18n.updatedAt,
    })
    .from(pages)
    .innerJoin(pageI18n, eq(pageI18n.pageId, pages.id))
    .where(eq(pages.isPublished, true));

  return group(
    rows.filter((row) => row.key !== homeKey),
    "",
  );
}
