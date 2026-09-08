import type { MetadataRoute } from "next";
import { assertEnv } from "@/lib/env";
import { enabledLocales } from "@/lib/public/locales";
import { HOME_PAGE_KEY } from "@/lib/pages/store";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { absoluteUrl, encodePath } from "@/lib/seo/urls";
import {
  publishedCategoryEntities,
  publishedPageEntities,
  publishedPostEntities,
  publishedProductEntities,
  type SitemapEntity,
} from "@/lib/seo/sitemap-data";

/**
 * `sitemap.xml`, generated from published content. SPEC.md §5 and §10:
 * "one URL entry per locale with hreflang alternates" and an `x-default`
 * pointing at the Thai version.
 *
 * Only enabled locales appear. A sitemap listing `/en/...` while the `en` row is
 * switched off would be a list of 404s handed straight to a crawler.
 */
export const revalidate = 3600;

const STATIC_PATHS = ["/", "/categories", "/news", "/contact"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = assertEnv().NEXT_PUBLIC_SITE_URL;
  const locales = await enabledLocales();

  /**
   * An unindexed site still serves a sitemap — it costs nothing and makes the
   * hreflang graph testable before launch — but robots.txt refuses crawling
   * while `settings.seo.allowIndexing` is off, so nothing acts on it.
   */
  const codes = locales.map((l) => l.code);
  const hasDefault = codes.includes(DEFAULT_LOCALE);

  const languagesFor = (paths: Record<string, string>): Record<string, string> => {
    const languages: Record<string, string> = {};
    for (const code of codes) {
      const path = paths[code] ?? paths[DEFAULT_LOCALE] ?? "/";
      languages[code] = absoluteUrl(base, code, encodePath(path));
    }
    if (hasDefault) {
      const path = paths[DEFAULT_LOCALE] ?? "/";
      languages["x-default"] = absoluteUrl(base, DEFAULT_LOCALE, encodePath(path));
    }
    return languages;
  };

  const expand = (entity: SitemapEntity, priority: number): MetadataRoute.Sitemap =>
    codes.map((code) => ({
      url: absoluteUrl(
        base,
        code,
        encodePath(entity.paths[code] ?? entity.paths[DEFAULT_LOCALE] ?? "/"),
      ),
      lastModified: entity.lastModified,
      changeFrequency: "weekly" as const,
      priority,
      alternates: { languages: languagesFor(entity.paths) },
    }));

  const [productEntities, categoryEntities, postEntities, pageEntities] = await Promise.all([
    publishedProductEntities(),
    publishedCategoryEntities(),
    publishedPostEntities(),
    publishedPageEntities(HOME_PAGE_KEY),
  ]);

  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.flatMap((path) =>
    codes.map((code) => ({
      url: absoluteUrl(base, code, path),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.7,
      alternates: {
        languages: languagesFor(Object.fromEntries(codes.map((c) => [c, path]))),
      },
    })),
  );

  return [
    ...staticEntries,
    ...categoryEntities.flatMap((e) => expand(e, 0.8)),
    ...productEntities.flatMap((e) => expand(e, 0.8)),
    ...postEntities.flatMap((e) => expand(e, 0.6)),
    ...pageEntities.flatMap((e) => expand(e, 0.5)),
  ];
}
