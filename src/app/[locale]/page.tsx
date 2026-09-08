import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCachedSetting } from "@/lib/settings/cached";
import { goLinePath } from "@/lib/line";
import { HOME_PAGE_KEY, defaultHomeSections, getPageByKey } from "@/lib/pages/store";
import { loadSectionData } from "@/lib/sections/data";
import { publicMetadata } from "@/lib/seo/metadata";
import { Sections } from "@/components/sections/render";

/**
 * The homepage, composed from `pages.home`'s section array (SPEC.md §6).
 *
 * When no `home` page row exists — a fresh deployment, or before anyone opens
 * the admin — it renders `defaultHomeSections()`, which is the composition the
 * site shipped with in phase 7. The site is never blank because nobody has
 * built a page yet.
 */
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPageByKey(HOME_PAGE_KEY, locale);
  return publicMetadata({
    locale,
    paths: "/",
    title: page?.seoTitle ?? undefined,
    description: page?.seoDescription ?? undefined,
  });
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("nav");
  const [general, page] = await Promise.all([
    getCachedSetting("general", locale),
    getPageByKey(HOME_PAGE_KEY, locale),
  ]);

  const sections = page && page.sections.length > 0 ? page.sections : defaultHomeSections();

  const data = await loadSectionData(sections, locale, {
    siteName: general.siteName,
    organisation: general.organisation,
    tagline: general.tagline,
    lineHref: goLinePath(),
  });

  return (
    <main id="content" aria-label={t("home")}>
      <Sections blocks={sections} data={data} />
    </main>
  );
}
