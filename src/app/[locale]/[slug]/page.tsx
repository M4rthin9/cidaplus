import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCachedSetting } from "@/lib/settings/cached";
import { goLinePath } from "@/lib/line";
import { HOME_PAGE_KEY, getPageBySlug } from "@/lib/pages/store";
import { loadSectionData } from "@/lib/sections/data";
import { publicMetadata } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { assertEnv } from "@/lib/env";
import { Sections } from "@/components/sections/render";
import { Breadcrumbs } from "@/components/site/breadcrumbs";

/**
 * CMS-managed static pages — §5's `/about`, `/how-to-order`, `/privacy-policy`,
 * `/cookies-policy` and anything else the operator creates.
 *
 * They use the same section renderer as the homepage, so this route is what
 * makes `/admin/pages` lead somewhere: without it the operator could build an
 * About page that no visitor could reach. Static segments (`/news`, `/contact`,
 * `/search`, `/categories`) are matched by Next before this one.
 */
export const revalidate = 60;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getPageBySlug(decodeURIComponent(slug), locale);
  if (!page) return {};
  return publicMetadata({
    locale,
    paths: `/${page.slug}`,
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? undefined,
  });
}

export default async function CmsPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const page = await getPageBySlug(decodeURIComponent(slug), locale);
  // The homepage has its own route; serving it here too would be a duplicate URL.
  if (!page || page.key === HOME_PAGE_KEY) notFound();

  const t = await getTranslations("nav");
  const general = await getCachedSetting("general", locale);

  const data = await loadSectionData(page.sections, locale, {
    siteName: general.siteName,
    organisation: general.organisation,
    tagline: general.tagline,
    lineHref: goLinePath(),
  });

  return (
    <main id="content">
      <JsonLd
        data={breadcrumbJsonLd(assertEnv().NEXT_PUBLIC_SITE_URL, locale, [
          { name: t("home"), path: "/" },
          { name: page.title, path: `/${page.slug}` },
        ])}
      />

      <div className="mx-auto max-w-(--container-site) px-4 pt-12 md:px-6">
        <Breadcrumbs items={[{ href: "/", label: t("home") }, { label: page.title }]} />
        <h1 className="text-3xl font-semibold md:text-[40px]">{page.title}</h1>
        <div className="mt-3 h-0.5 w-12 rounded-full bg-(--color-brand)" aria-hidden="true" />
      </div>
      <Sections blocks={page.sections} data={data} />
    </main>
  );
}
