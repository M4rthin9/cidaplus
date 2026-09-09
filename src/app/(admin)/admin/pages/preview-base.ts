import "server-only";

import { getMessages } from "next-intl/server";
import { mediaPickerItems } from "@/lib/catalog/queries";
import { goLinePath } from "@/lib/line";
import { featuredProducts, latestPosts, publishedCategories } from "@/lib/public/queries";
import { getCachedSetting } from "@/lib/settings/cached";
import { DEFAULT_LOCALE } from "@/lib/slug";
import type { PreviewBase } from "@/lib/sections/preview";
import type { PickerItem } from "@/components/media/media-picker";

/**
 * Everything the editor's live preview needs, loaded once per editor render.
 *
 * A superset on purpose: the browser narrows it per block as the operator
 * changes a limit or a filter, so reordering and editing repaint with no round
 * trip. The ceilings match the schema's own maxima, so no block can ask for
 * more than is loaded here.
 */
export async function loadPreviewBase(): Promise<{
  previewBase: PreviewBase;
  media: PickerItem[];
  categories: { id: string; name: string }[];
  messages: Record<string, unknown>;
  locale: string;
}> {
  const locale = DEFAULT_LOCALE;

  const [general, pickerItems, categories, products, posts, messages] = await Promise.all([
    getCachedSetting("general", locale),
    mediaPickerItems(),
    publishedCategories(locale),
    featuredProducts(locale, 24),
    latestPosts(locale, 12),
    getMessages({ locale }),
  ]);

  const media = pickerItems.map((item) => ({ ...item, alt: item.alt ?? null }));

  return {
    previewBase: {
      products,
      posts,
      categories,
      media: Object.fromEntries(media.map((m) => [m.id, m])),
      siteName: general.siteName,
      organisation: general.organisation,
      tagline: general.tagline,
      lineHref: goLinePath(),
    },
    media,
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    messages: messages as Record<string, unknown>,
    locale,
  };
}
