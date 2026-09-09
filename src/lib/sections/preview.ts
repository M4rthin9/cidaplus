import type { SectionData } from "./data";
import type { SectionsValue } from "./schema";
import type {
  CategoryCardData,
  PostCardData,
  ProductCardData,
  PublicMedia,
} from "@/lib/public/queries";

/**
 * The admin's live preview data.
 *
 * The editor page loads a superset once — every published category, the
 * featured products, the latest posts, the whole media picker — and this
 * narrows it per block in the browser, so dragging a block or changing a limit
 * repaints with no round trip. The filters applied here are the same ones
 * `loadSectionData` applies in SQL, which is what keeps the preview honest
 * rather than merely plausible.
 *
 * No server import: this runs in the editor's client bundle.
 */
export type PreviewBase = {
  products: ProductCardData[];
  posts: PostCardData[];
  categories: CategoryCardData[];
  media: Record<string, PublicMedia>;
  siteName: string;
  organisation?: string;
  tagline?: string;
  lineHref: string;
};

export function buildPreviewData(blocks: SectionsValue, base: PreviewBase): SectionData {
  const productsByBlock: Record<string, ProductCardData[]> = {};
  const postsByBlock: Record<string, PostCardData[]> = {};

  for (const block of blocks) {
    if (block.type === "featured_products") {
      const pool = block.categoryId
        ? base.products.filter((p) => p.categoryId === block.categoryId)
        : base.products;
      productsByBlock[block.id] = pool.slice(0, block.limit);
    }
    if (block.type === "latest_posts") {
      const pool =
        block.postType === "all" ? base.posts : base.posts.filter((p) => p.type === block.postType);
      postsByBlock[block.id] = pool.slice(0, block.limit);
    }
  }

  return {
    productsByBlock,
    postsByBlock,
    categories: base.categories,
    media: base.media,
    siteName: base.siteName,
    organisation: base.organisation,
    tagline: base.tagline,
    lineHref: base.lineHref,
  };
}
