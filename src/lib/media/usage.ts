import { eq, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, media, posts, productMedia, products } from "@/db/schema";

/**
 * "Used in N places" (SPEC.md §9). A delete must never silently blank a product
 * image or a category hero, so every column that can point at `media` is counted
 * here — miss one and the guard is decorative.
 */
export type MediaUsage = {
  readonly productImages: number;
  readonly productOg: number;
  readonly categoryHero: number;
  readonly categoryIcon: number;
  readonly categoryOg: number;
  readonly postCover: number;
  readonly total: number;
};

const count = sql<number>`count(*)::int`;

export async function getMediaUsage(mediaId: string): Promise<MediaUsage> {
  const [pm] = await db
    .select({ n: count })
    .from(productMedia)
    .where(eq(productMedia.mediaId, mediaId));

  const [pog] = await db.select({ n: count }).from(products).where(eq(products.ogMediaId, mediaId));

  const [cat] = await db
    .select({
      hero: sql<number>`count(*) filter (where ${categories.heroMediaId} = ${mediaId})::int`,
      icon: sql<number>`count(*) filter (where ${categories.iconMediaId} = ${mediaId})::int`,
      og: sql<number>`count(*) filter (where ${categories.ogMediaId} = ${mediaId})::int`,
    })
    .from(categories)
    .where(
      or(
        eq(categories.heroMediaId, mediaId),
        eq(categories.iconMediaId, mediaId),
        eq(categories.ogMediaId, mediaId),
      ),
    );

  const [post] = await db.select({ n: count }).from(posts).where(eq(posts.coverMediaId, mediaId));

  const usage = {
    productImages: pm?.n ?? 0,
    productOg: pog?.n ?? 0,
    categoryHero: cat?.hero ?? 0,
    categoryIcon: cat?.icon ?? 0,
    categoryOg: cat?.og ?? 0,
    postCover: post?.n ?? 0,
  };

  return {
    ...usage,
    total: Object.values(usage).reduce((a, b) => a + b, 0),
  };
}

/** Thai description of where an image is in use, for the delete confirmation. */
export function describeUsage(usage: MediaUsage): string[] {
  const parts: Array<[number, string]> = [
    [usage.productImages, "รูปสินค้า"],
    [usage.productOg, "ภาพแชร์ของสินค้า"],
    [usage.categoryHero, "ภาพหลักของหมวดหมู่"],
    [usage.categoryIcon, "ไอคอนหมวดหมู่"],
    [usage.categoryOg, "ภาพแชร์ของหมวดหมู่"],
    [usage.postCover, "ภาพหน้าปกข่าว"],
  ];
  return parts.filter(([n]) => n > 0).map(([n, label]) => `${label} ${n} รายการ`);
}

/** Total bytes on disk, for the dashboard's disk-usage warning (SPEC.md §2). */
export async function getMediaDiskUsage(): Promise<{ files: number; bytes: number }> {
  const [row] = await db
    .select({
      files: count,
      bytes: sql<number>`coalesce(sum(${media.bytes}), 0)::bigint`,
    })
    .from(media);
  return { files: row?.files ?? 0, bytes: Number(row?.bytes ?? 0) };
}
