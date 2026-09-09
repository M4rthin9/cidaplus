import "server-only";

import { referencedMediaIds } from "@/lib/richtext/schema";
import {
  featuredProducts,
  latestPosts,
  mediaByIds,
  publishedCategories,
  type CategoryCardData,
  type PostCardData,
  type ProductCardData,
  type PublicMedia,
} from "@/lib/public/queries";
import type { SectionsValue } from "./schema";

/**
 * Everything the blocks on a page need, fetched once.
 *
 * The renderers are deliberately dumb: they take data as props and hold no
 * server imports, so the *same* components draw the public page and the admin's
 * live preview. That is what makes the preview honest — a preview built from a
 * second set of components is a preview of the wrong thing.
 *
 * Keyed by block id rather than by type, because two `featured_products` blocks
 * on one page can carry different limits and categories.
 */
export type SectionData = {
  productsByBlock: Record<string, ProductCardData[]>;
  postsByBlock: Record<string, PostCardData[]>;
  categories: CategoryCardData[];
  media: Record<string, PublicMedia>;
  /** Site identity, so a hero with no headline of its own still says who this is. */
  siteName: string;
  organisation?: string;
  tagline?: string;
  lineHref: string;
};

export type SectionDataInput = Pick<
  SectionData,
  "siteName" | "organisation" | "tagline" | "lineHref"
>;

export async function loadSectionData(
  blocks: SectionsValue,
  locale: string,
  identity: SectionDataInput,
): Promise<SectionData> {
  const visible = blocks.filter((b) => b.isVisible);

  const needsCategories = visible.some(
    (b) => b.type === "category_showcase" || b.type === "featured_products",
  );

  const mediaIds = new Set<string>();
  for (const block of visible) {
    if (block.type === "hero" && block.mediaId) mediaIds.add(block.mediaId);
    if (block.type === "image_banner" && block.mediaId) mediaIds.add(block.mediaId);
    if (block.type === "gallery_strip") for (const id of block.mediaIds) mediaIds.add(id);
    if (block.type === "rich_text")
      for (const id of referencedMediaIds(block.body)) mediaIds.add(id);
  }

  const productBlocks = visible.filter((b) => b.type === "featured_products");
  const postBlocks = visible.filter((b) => b.type === "latest_posts");

  const [categories, media, productLists, postLists] = await Promise.all([
    needsCategories ? publishedCategories(locale) : Promise.resolve([]),
    mediaByIds([...mediaIds], locale),
    Promise.all(
      productBlocks.map((b) => featuredProducts(locale, b.limit, b.categoryId || undefined)),
    ),
    Promise.all(
      postBlocks.map((b) =>
        latestPosts(locale, b.limit, b.postType === "all" ? undefined : b.postType),
      ),
    ),
  ]);

  return {
    productsByBlock: Object.fromEntries(productBlocks.map((b, i) => [b.id, productLists[i] ?? []])),
    postsByBlock: Object.fromEntries(postBlocks.map((b, i) => [b.id, postLists[i] ?? []])),
    categories,
    media: Object.fromEntries(media),
    ...identity,
  };
}

/** An empty bundle, for a page whose blocks need nothing fetched. */
export function emptySectionData(identity: SectionDataInput): SectionData {
  return {
    productsByBlock: {},
    postsByBlock: {},
    categories: [],
    media: {},
    ...identity,
  };
}
