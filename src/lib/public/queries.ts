import "server-only";

import { and, asc, desc, eq, ilike, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  categories,
  categoryI18n,
  media,
  mediaI18n,
  postI18n,
  posts,
  productI18n,
  productMedia,
  productSpecI18n,
  productSpecs,
  products,
} from "@/db/schema";
import { FALLBACK_LOCALE, resolveTranslation, resolveTranslations } from "@/db/i18n";
import type { ThumbMedia } from "@/components/media/media-thumb";
import { referencedMediaIds, type RichDoc } from "@/lib/richtext/schema";
import type { MediaLookup } from "@/lib/richtext/render";

/**
 * Every read the public site does. SPEC.md §9, §10.
 *
 * Two rules are enforced here and nowhere else, so a page cannot forget them:
 *
 *  - Published means `is_published AND published_at <= now()` AND not
 *    soft-deleted (§9). "Scheduled" is that predicate, not a third column.
 *  - Thai is the fallback for every locale (§6). Rows are fetched for the
 *    requested locale *and* Thai, then resolved in `src/db/i18n.ts`, so a page
 *    in a locale with no translation renders Thai rather than an empty string.
 */

/** The locales a query must fetch to be able to fall back. */
function localeSet(locale: string): string[] {
  return locale === FALLBACK_LOCALE ? [FALLBACK_LOCALE] : [locale, FALLBACK_LOCALE];
}

const productIsLive = and(
  eq(products.isPublished, true),
  lte(products.publishedAt, sql`now()`),
  isNull(products.deletedAt),
);

const postIsLive = and(
  eq(posts.isPublished, true),
  lte(posts.publishedAt, sql`now()`),
  isNull(posts.deletedAt),
);

const categoryIsLive = and(eq(categories.isPublished, true), isNull(categories.deletedAt));

export type PublicMedia = ThumbMedia & { alt: string | null };

export type ProductCardData = {
  id: string;
  /** Carried so the admin preview can apply a block's category filter exactly. */
  categoryId: string;
  slug: string;
  name: string;
  price: string | null;
  priceDisplay: "exact" | "from" | "contact" | "hidden";
  image: PublicMedia | null;
};

export type CategoryCardData = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: PublicMedia | null;
  productCount: number;
};

export type PostCardData = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  type: "news" | "event";
  publishedAt: Date | null;
  eventStartAt: Date | null;
  cover: PublicMedia | null;
};

/**
 * Alt text for a set of media, resolved per locale. Kept separate because every
 * consumer needs it and a join would multiply rows on the media side.
 */
async function altFor(mediaIds: string[], locale: string): Promise<Map<string, string | null>> {
  if (mediaIds.length === 0) return new Map();

  const rows = await db
    .select({ mediaId: mediaI18n.mediaId, locale: mediaI18n.locale, alt: mediaI18n.alt })
    .from(mediaI18n)
    .where(and(inArray(mediaI18n.mediaId, mediaIds), inArray(mediaI18n.locale, localeSet(locale))));

  const resolved = resolveTranslations(rows, (r) => r.mediaId, locale);
  return new Map([...resolved].map(([id, r]) => [id, r.row.alt]));
}

/** The primary image of each product, or its lowest-sorted one. */
async function primaryImages(
  productIds: string[],
  locale: string,
): Promise<Map<string, PublicMedia>> {
  if (productIds.length === 0) return new Map();

  const rows = await db
    .select({
      productId: productMedia.productId,
      isPrimary: productMedia.isPrimary,
      sortOrder: productMedia.sortOrder,
      id: media.id,
      storageKey: media.storageKey,
      filename: media.filename,
      blurhash: media.blurhash,
      focalX: media.focalX,
      focalY: media.focalY,
    })
    .from(productMedia)
    .innerJoin(media, eq(media.id, productMedia.mediaId))
    .where(and(inArray(productMedia.productId, productIds), isNull(media.deletedAt)))
    .orderBy(desc(productMedia.isPrimary), asc(productMedia.sortOrder));

  const alts = await altFor(
    rows.map((r) => r.id),
    locale,
  );

  const out = new Map<string, PublicMedia>();
  for (const row of rows) {
    if (out.has(row.productId)) continue; // ordered above: first hit is the primary
    out.set(row.productId, { ...row, alt: alts.get(row.id) ?? null });
  }
  return out;
}

async function toProductCards(
  rows: {
    id: string;
    categoryId: string;
    price: string | null;
    priceDisplay: ProductCardData["priceDisplay"];
  }[],
  locale: string,
): Promise<ProductCardData[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const i18n = await db
    .select({
      productId: productI18n.productId,
      locale: productI18n.locale,
      slug: productI18n.slug,
      name: productI18n.name,
    })
    .from(productI18n)
    .where(and(inArray(productI18n.productId, ids), inArray(productI18n.locale, localeSet(locale))));

  const names = resolveTranslations(i18n, (r) => r.productId, locale);
  const images = await primaryImages(ids, locale);

  const cards: ProductCardData[] = [];
  for (const row of rows) {
    const t = names.get(row.id);
    // No translation in any locale is a data error, not a missing translation —
    // rendering a card with no name would be worse than omitting it.
    if (!t) continue;
    cards.push({
      id: row.id,
      categoryId: row.categoryId,
      slug: t.row.slug,
      name: t.row.name,
      price: row.price,
      priceDisplay: row.priceDisplay,
      image: images.get(row.id) ?? null,
    });
  }
  return cards;
}

export async function featuredProducts(
  locale: string,
  limit = 8,
  categoryId?: string,
): Promise<ProductCardData[]> {
  const rows = await db
    .select({
      id: products.id,
      categoryId: products.categoryId,
      price: products.price,
      priceDisplay: products.priceDisplay,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        productIsLive,
        categoryIsLive,
        eq(products.isFeatured, true),
        categoryId ? eq(products.categoryId, categoryId) : undefined,
      ),
    )
    .orderBy(asc(products.sortOrder))
    .limit(limit);

  return toProductCards(rows, locale);
}

export async function publishedCategories(locale: string): Promise<CategoryCardData[]> {
  const rows = await db
    .select({
      id: categories.id,
      heroMediaId: categories.heroMediaId,
      productCount: sql<number>`(
        select count(*)::int from ${products}
        where ${products.categoryId} = ${categories.id}
          and ${products.isPublished} = true
          and ${products.publishedAt} <= now()
          and ${products.deletedAt} is null
      )`,
    })
    .from(categories)
    .where(and(categoryIsLive, isNull(categories.parentId)))
    .orderBy(asc(categories.sortOrder));

  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const i18n = await db
    .select({
      categoryId: categoryI18n.categoryId,
      locale: categoryI18n.locale,
      slug: categoryI18n.slug,
      name: categoryI18n.name,
      description: categoryI18n.description,
    })
    .from(categoryI18n)
    .where(
      and(inArray(categoryI18n.categoryId, ids), inArray(categoryI18n.locale, localeSet(locale))),
    );

  const names = resolveTranslations(i18n, (r) => r.categoryId, locale);
  const heroIds = rows.map((r) => r.heroMediaId).filter((v): v is string => Boolean(v));
  const heroes = await mediaByIds(heroIds, locale);

  const out: CategoryCardData[] = [];
  for (const row of rows) {
    const t = names.get(row.id);
    if (!t) continue;
    out.push({
      id: row.id,
      slug: t.row.slug,
      name: t.row.name,
      description: t.row.description,
      image: row.heroMediaId ? (heroes.get(row.heroMediaId) ?? null) : null,
      productCount: row.productCount,
    });
  }
  return out;
}

export async function mediaByIds(ids: string[], locale: string): Promise<Map<string, PublicMedia>> {
  if (ids.length === 0) return new Map();

  const rows = await db
    .select({
      id: media.id,
      storageKey: media.storageKey,
      filename: media.filename,
      blurhash: media.blurhash,
      focalX: media.focalX,
      focalY: media.focalY,
    })
    .from(media)
    .where(and(inArray(media.id, ids), isNull(media.deletedAt)));

  const alts = await altFor(
    rows.map((r) => r.id),
    locale,
  );
  return new Map(rows.map((r) => [r.id, { ...r, alt: alts.get(r.id) ?? null }]));
}

export type CategoryPage = {
  category: CategoryCardData;
  products: ProductCardData[];
  total: number;
};

export type ProductSort = "default" | "newest" | "price-asc" | "price-desc";

export const PAGE_SIZE = 12;

export async function categoryBySlug(
  locale: string,
  slug: string,
): Promise<{ id: string; slug: string; name: string; description: string | null } | null> {
  /**
   * The slug is matched in the requested locale *or* Thai: a locale with no
   * translation falls back to the Thai row, so the Thai slug is the live URL
   * under that locale too.
   */
  const rows = await db
    .select({
      id: categories.id,
      locale: categoryI18n.locale,
      slug: categoryI18n.slug,
      name: categoryI18n.name,
      description: categoryI18n.description,
    })
    .from(categoryI18n)
    .innerJoin(categories, eq(categories.id, categoryI18n.categoryId))
    .where(
      and(
        eq(categoryI18n.slug, slug),
        inArray(categoryI18n.locale, localeSet(locale)),
        categoryIsLive,
      ),
    );

  const hit = resolveTranslation(rows, locale);
  if (!hit) return null;

  // The name must come from the resolved translation for the *category*, which
  // may be a different row than the one the slug matched.
  const all = await db
    .select({
      id: categories.id,
      locale: categoryI18n.locale,
      slug: categoryI18n.slug,
      name: categoryI18n.name,
      description: categoryI18n.description,
    })
    .from(categoryI18n)
    .innerJoin(categories, eq(categories.id, categoryI18n.categoryId))
    .where(
      and(
        eq(categoryI18n.categoryId, hit.row.id),
        inArray(categoryI18n.locale, localeSet(locale)),
      ),
    );

  const resolved = resolveTranslation(all, locale) ?? hit;
  return {
    id: hit.row.id,
    slug: resolved.row.slug,
    name: resolved.row.name,
    description: resolved.row.description,
  };
}

export async function productsInCategory(
  locale: string,
  categoryId: string,
  page: number,
  sort: ProductSort,
): Promise<{ items: ProductCardData[]; total: number }> {
  const where = and(productIsLive, eq(products.categoryId, categoryId));

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(where);

  const order =
    sort === "newest"
      ? [desc(products.publishedAt)]
      : sort === "price-asc"
        ? [asc(products.price)]
        : sort === "price-desc"
          ? [desc(products.price)]
          : [asc(products.sortOrder)];

  const rows = await db
    .select({
      id: products.id,
      categoryId: products.categoryId,
      price: products.price,
      priceDisplay: products.priceDisplay,
    })
    .from(products)
    .where(where)
    .orderBy(...order)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return { items: await toProductCards(rows, locale), total: countRow?.n ?? 0 };
}

export type ProductDetailData = {
  id: string;
  slug: string;
  name: string;
  shortDesc: string | null;
  body: RichDoc | null;
  price: string | null;
  priceDisplay: ProductCardData["priceDisplay"];
  sku: string | null;
  images: PublicMedia[];
  specs: { label: string; value: string }[];
  categoryId: string;
  category: { slug: string; name: string } | null;
  /** Every locale that has a row, for the switcher's per-locale slugs. */
  slugsByLocale: Record<string, string>;
};

export async function productBySlug(
  locale: string,
  slug: string,
): Promise<ProductDetailData | null> {
  const match = await db
    .select({ productId: productI18n.productId, locale: productI18n.locale })
    .from(productI18n)
    .innerJoin(products, eq(products.id, productI18n.productId))
    .where(
      and(eq(productI18n.slug, slug), inArray(productI18n.locale, localeSet(locale)), productIsLive),
    );

  const hit = resolveTranslation(match, locale);
  if (!hit) return null;
  const productId = hit.row.productId;

  const [row] = await db
    .select({
      id: products.id,
      price: products.price,
      priceDisplay: products.priceDisplay,
      sku: products.sku,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(eq(products.id, productId));

  if (!row) return null;

  // Every locale, not just the requested pair: the language switcher needs each
  // locale's own slug so it can land on the same product rather than the home page.
  const allI18n = await db
    .select({
      productId: productI18n.productId,
      locale: productI18n.locale,
      slug: productI18n.slug,
      name: productI18n.name,
      shortDesc: productI18n.shortDesc,
      body: productI18n.body,
    })
    .from(productI18n)
    .where(eq(productI18n.productId, productId));

  const t = resolveTranslation(allI18n, locale);
  if (!t) return null;

  const imageRows = await db
    .select({
      id: media.id,
      storageKey: media.storageKey,
      filename: media.filename,
      blurhash: media.blurhash,
      focalX: media.focalX,
      focalY: media.focalY,
      isPrimary: productMedia.isPrimary,
      sortOrder: productMedia.sortOrder,
    })
    .from(productMedia)
    .innerJoin(media, eq(media.id, productMedia.mediaId))
    .where(and(eq(productMedia.productId, productId), isNull(media.deletedAt)))
    .orderBy(desc(productMedia.isPrimary), asc(productMedia.sortOrder));

  const alts = await altFor(
    imageRows.map((r) => r.id),
    locale,
  );

  const specRows = await db
    .select({
      specId: productSpecs.id,
      sortOrder: productSpecs.sortOrder,
      locale: productSpecI18n.locale,
      label: productSpecI18n.label,
      value: productSpecI18n.value,
    })
    .from(productSpecs)
    .innerJoin(productSpecI18n, eq(productSpecI18n.specId, productSpecs.id))
    .where(
      and(
        eq(productSpecs.productId, productId),
        inArray(productSpecI18n.locale, localeSet(locale)),
      ),
    )
    .orderBy(asc(productSpecs.sortOrder));

  const specsResolved = resolveTranslations(specRows, (r) => r.specId, locale);
  const specOrder = [...new Map(specRows.map((r) => [r.specId, r.sortOrder])).entries()].sort(
    (a, b) => a[1] - b[1],
  );

  const category = await categoryNameById(row.categoryId, locale);

  return {
    id: row.id,
    slug: t.row.slug,
    name: t.row.name,
    shortDesc: t.row.shortDesc,
    body: (t.row.body as RichDoc | null) ?? null,
    price: row.price,
    priceDisplay: row.priceDisplay,
    sku: row.sku,
    images: imageRows.map((r) => ({ ...r, alt: alts.get(r.id) ?? null })),
    categoryId: row.categoryId,
    specs: specOrder.flatMap(([specId]) => {
      const s = specsResolved.get(specId);
      return s ? [{ label: s.row.label, value: s.row.value }] : [];
    }),
    category,
    slugsByLocale: Object.fromEntries(allI18n.map((r) => [r.locale, r.slug])),
  };
}

async function categoryNameById(
  categoryId: string,
  locale: string,
): Promise<{ slug: string; name: string } | null> {
  const rows = await db
    .select({
      locale: categoryI18n.locale,
      slug: categoryI18n.slug,
      name: categoryI18n.name,
    })
    .from(categoryI18n)
    .innerJoin(categories, eq(categories.id, categoryI18n.categoryId))
    .where(
      and(
        eq(categoryI18n.categoryId, categoryId),
        inArray(categoryI18n.locale, localeSet(locale)),
        categoryIsLive,
      ),
    );

  const t = resolveTranslation(rows, locale);
  return t ? { slug: t.row.slug, name: t.row.name } : null;
}

export async function relatedProducts(
  locale: string,
  categoryId: string,
  excludeId: string,
  limit = 4,
): Promise<ProductCardData[]> {
  const rows = await db
    .select({
      id: products.id,
      categoryId: products.categoryId,
      price: products.price,
      priceDisplay: products.priceDisplay,
    })
    .from(products)
    .where(and(productIsLive, eq(products.categoryId, categoryId), ne(products.id, excludeId)))
    .orderBy(asc(products.sortOrder))
    .limit(limit);

  return toProductCards(rows, locale);
}

// --- posts -----------------------------------------------------------------

async function toPostCards(
  rows: {
    id: string;
    type: "news" | "event";
    publishedAt: Date | null;
    eventStartAt: Date | null;
    coverMediaId: string | null;
  }[],
  locale: string,
): Promise<PostCardData[]> {
  if (rows.length === 0) return [];

  const i18n = await db
    .select({
      postId: postI18n.postId,
      locale: postI18n.locale,
      slug: postI18n.slug,
      title: postI18n.title,
      excerpt: postI18n.excerpt,
    })
    .from(postI18n)
    .where(
      and(
        inArray(
          postI18n.postId,
          rows.map((r) => r.id),
        ),
        inArray(postI18n.locale, localeSet(locale)),
      ),
    );

  const titles = resolveTranslations(i18n, (r) => r.postId, locale);
  const covers = await mediaByIds(
    rows.map((r) => r.coverMediaId).filter((v): v is string => Boolean(v)),
    locale,
  );

  const out: PostCardData[] = [];
  for (const row of rows) {
    const t = titles.get(row.id);
    if (!t) continue;
    out.push({
      id: row.id,
      slug: t.row.slug,
      title: t.row.title,
      excerpt: t.row.excerpt,
      type: row.type,
      publishedAt: row.publishedAt,
      eventStartAt: row.eventStartAt,
      cover: row.coverMediaId ? (covers.get(row.coverMediaId) ?? null) : null,
    });
  }
  return out;
}

export async function latestPosts(
  locale: string,
  limit = 3,
  type?: "news" | "event",
): Promise<PostCardData[]> {
  const rows = await db
    .select({
      id: posts.id,
      type: posts.type,
      publishedAt: posts.publishedAt,
      eventStartAt: posts.eventStartAt,
      coverMediaId: posts.coverMediaId,
    })
    .from(posts)
    .where(type ? and(postIsLive, eq(posts.type, type)) : postIsLive)
    .orderBy(desc(posts.publishedAt))
    .limit(limit);

  return toPostCards(rows, locale);
}

export async function publishedPosts(
  locale: string,
  type: "news" | "event" | null,
  page: number,
): Promise<{ items: PostCardData[]; total: number }> {
  const where = type ? and(postIsLive, eq(posts.type, type)) : postIsLive;

  const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(posts).where(where);

  const rows = await db
    .select({
      id: posts.id,
      type: posts.type,
      publishedAt: posts.publishedAt,
      eventStartAt: posts.eventStartAt,
      coverMediaId: posts.coverMediaId,
    })
    .from(posts)
    .where(where)
    .orderBy(desc(posts.publishedAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return { items: await toPostCards(rows, locale), total: countRow?.n ?? 0 };
}

export type PostDetailData = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: RichDoc | null;
  type: "news" | "event";
  publishedAt: Date | null;
  eventStartAt: Date | null;
  eventEndAt: Date | null;
  eventLocation: string | null;
  cover: PublicMedia | null;
  slugsByLocale: Record<string, string>;
};

export async function postBySlug(locale: string, slug: string): Promise<PostDetailData | null> {
  const match = await db
    .select({ postId: postI18n.postId, locale: postI18n.locale })
    .from(postI18n)
    .innerJoin(posts, eq(posts.id, postI18n.postId))
    .where(and(eq(postI18n.slug, slug), inArray(postI18n.locale, localeSet(locale)), postIsLive));

  const hit = resolveTranslation(match, locale);
  if (!hit) return null;
  const postId = hit.row.postId;

  const [row] = await db
    .select({
      id: posts.id,
      type: posts.type,
      publishedAt: posts.publishedAt,
      eventStartAt: posts.eventStartAt,
      eventEndAt: posts.eventEndAt,
      eventLocation: posts.eventLocation,
      coverMediaId: posts.coverMediaId,
    })
    .from(posts)
    .where(eq(posts.id, postId));

  if (!row) return null;

  const allI18n = await db
    .select({
      postId: postI18n.postId,
      locale: postI18n.locale,
      slug: postI18n.slug,
      title: postI18n.title,
      excerpt: postI18n.excerpt,
      body: postI18n.body,
    })
    .from(postI18n)
    .where(eq(postI18n.postId, postId));

  const t = resolveTranslation(allI18n, locale);
  if (!t) return null;

  const covers = row.coverMediaId ? await mediaByIds([row.coverMediaId], locale) : new Map();

  return {
    id: row.id,
    slug: t.row.slug,
    title: t.row.title,
    excerpt: t.row.excerpt,
    body: (t.row.body as RichDoc | null) ?? null,
    type: row.type,
    publishedAt: row.publishedAt,
    eventStartAt: row.eventStartAt,
    eventEndAt: row.eventEndAt,
    eventLocation: row.eventLocation,
    cover: row.coverMediaId ? (covers.get(row.coverMediaId) ?? null) : null,
    slugsByLocale: Object.fromEntries(allI18n.map((r) => [r.locale, r.slug])),
  };
}

// --- search ----------------------------------------------------------------

export type SearchResults = { products: ProductCardData[]; posts: PostCardData[] };

/**
 * §5's site-wide search. Deliberately a plain ILIKE over names and titles: a
 * Thai full-text configuration needs a word-segmentation dictionary Postgres
 * does not ship, and `to_tsvector('simple', …)` on unsegmented Thai matches
 * whole strings only — worse than a substring match, not better.
 */
export async function search(locale: string, query: string): Promise<SearchResults> {
  const q = query.trim();
  if (q.length === 0) return { products: [], posts: [] };
  const pattern = `%${q}%`;

  const productRows = await db
    .selectDistinctOn([products.id], {
      id: products.id,
      categoryId: products.categoryId,
      price: products.price,
      priceDisplay: products.priceDisplay,
    })
    .from(products)
    .innerJoin(productI18n, eq(productI18n.productId, products.id))
    .where(
      and(
        productIsLive,
        inArray(productI18n.locale, localeSet(locale)),
        or(ilike(productI18n.name, pattern), ilike(productI18n.shortDesc, pattern)),
      ),
    )
    .limit(24);

  const postRows = await db
    .selectDistinctOn([posts.id], {
      id: posts.id,
      type: posts.type,
      publishedAt: posts.publishedAt,
      eventStartAt: posts.eventStartAt,
      coverMediaId: posts.coverMediaId,
    })
    .from(posts)
    .innerJoin(postI18n, eq(postI18n.postId, posts.id))
    .where(
      and(
        postIsLive,
        inArray(postI18n.locale, localeSet(locale)),
        or(ilike(postI18n.title, pattern), ilike(postI18n.excerpt, pattern)),
      ),
    )
    .limit(24);

  return {
    products: await toProductCards(productRows, locale),
    posts: await toPostCards(postRows, locale),
  };
}

/**
 * The media a rich-text body references, keyed by id, for `RichText`. Bodies
 * store a `mediaId` and never a URL (§14 decision 18), so the renderer needs
 * this map rather than being able to resolve a src itself.
 */
export async function bodyMedia(doc: RichDoc | null, locale: string): Promise<MediaLookup> {
  if (!doc) return new Map();
  const ids = referencedMediaIds(doc);
  if (ids.length === 0) return new Map();
  return mediaByIds(ids, locale);
}

/**
 * Every locale's slug for one entity, so the language switcher can land on the
 * same page rather than the homepage (SPEC.md §5). Slugs are per-locale (§14
 * decision 17), so this cannot be derived from the current path.
 *
 * A locale with no row of its own keeps the fallback locale's slug, which is
 * the URL that locale actually serves.
 */
export async function alternateSlugs(
  kind: "product" | "category" | "news",
  slug: string,
  locale: string,
): Promise<Record<string, string>> {
  const localeFilter = inArray(
    kind === "product"
      ? productI18n.locale
      : kind === "category"
        ? categoryI18n.locale
        : postI18n.locale,
    localeSet(locale),
  );

  if (kind === "product") {
    const match = await db
      .select({ productId: productI18n.productId, locale: productI18n.locale })
      .from(productI18n)
      .innerJoin(products, eq(products.id, productI18n.productId))
      .where(and(eq(productI18n.slug, slug), localeFilter, productIsLive));
    const hit = resolveTranslation(match, locale);
    if (!hit) return {};
    const rows = await db
      .select({ locale: productI18n.locale, slug: productI18n.slug })
      .from(productI18n)
      .where(eq(productI18n.productId, hit.row.productId));
    return Object.fromEntries(rows.map((r) => [r.locale, r.slug]));
  }

  if (kind === "category") {
    const match = await db
      .select({ categoryId: categoryI18n.categoryId, locale: categoryI18n.locale })
      .from(categoryI18n)
      .innerJoin(categories, eq(categories.id, categoryI18n.categoryId))
      .where(and(eq(categoryI18n.slug, slug), localeFilter, categoryIsLive));
    const hit = resolveTranslation(match, locale);
    if (!hit) return {};
    const rows = await db
      .select({ locale: categoryI18n.locale, slug: categoryI18n.slug })
      .from(categoryI18n)
      .where(eq(categoryI18n.categoryId, hit.row.categoryId));
    return Object.fromEntries(rows.map((r) => [r.locale, r.slug]));
  }

  const match = await db
    .select({ postId: postI18n.postId, locale: postI18n.locale })
    .from(postI18n)
    .innerJoin(posts, eq(posts.id, postI18n.postId))
    .where(and(eq(postI18n.slug, slug), localeFilter, postIsLive));
  const hit = resolveTranslation(match, locale);
  if (!hit) return {};
  const rows = await db
    .select({ locale: postI18n.locale, slug: postI18n.slug })
    .from(postI18n)
    .where(eq(postI18n.postId, hit.row.postId));
  return Object.fromEntries(rows.map((r) => [r.locale, r.slug]));
}
