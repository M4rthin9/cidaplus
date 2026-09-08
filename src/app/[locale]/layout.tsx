import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { isLocaleEnabled } from "@/lib/public/locales";
import { getCachedSetting } from "@/lib/settings/cached";
import { themeStyle } from "@/lib/settings/theme";
import { FontPreload, sharedViewport } from "@/lib/document-head";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteJsonLd } from "@/components/site/site-json-ld";
import { ConsentGate } from "@/components/site/consent-gate";
import { assertEnv } from "@/lib/env";
import { buildAlternates } from "@/lib/seo/alternates";
import { DEFAULT_OG_IMAGE, OG_HEIGHT, OG_WIDTH } from "@/lib/seo/metadata";
import "../globals.css";

/**
 * Root layout for the storefront.
 *
 * `<html>` lives here rather than in a layout shared with the admin so that
 * `lang` is the `[locale]` route param — DESIGN.md requires `lang` and `dir` set
 * per locale "from day one, even with one locale enabled", and a layout above a
 * dynamic segment never receives its params, so a shared root would have had to
 * read the request path and go dynamic to get it right.
 *
 * Two locale checks, not one:
 *
 *  - `hasLocale` rejects a locale the routing has never heard of.
 *  - `isLocaleEnabled` rejects one that exists but is switched off in the
 *    `locales` table. That is what keeps `/en/...` dark while §14 decision 9
 *    holds, and what makes switching English on a row update rather than a
 *    deploy — the routing already knows how to shape the URLs.
 */
/**
 * `settings.seo.allowIndexing` is off until the operator turns it on, so the
 * storefront ships unindexed rather than letting a half-populated catalog into
 * search results. The full SEO pass — JSON-LD, sitemap, hreflang, OG images —
 * is phase 10; this only honours the switch phase 6 already built.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [general, seo] = await Promise.all([
    getCachedSetting("general", locale),
    getCachedSetting("seo", locale),
  ]);

  const base = assertEnv().NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");

  return {
    /**
     * Every relative URL in a page's metadata resolves against this, which is
     * what lets the pages below pass paths rather than repeating the origin —
     * and what keeps the canonical, the OG url and the sitemap in agreement.
     */
    metadataBase: new URL(base),
    title: {
      default: seo.defaultTitle ?? general.siteName,
      template: seo.titleTemplate ?? `%s — ${general.siteName}`,
    },
    description: seo.defaultDescription ?? general.tagline,
    robots: { index: seo.allowIndexing, follow: seo.allowIndexing },
    alternates: await buildAlternates(locale, "/"),
    /**
     * Provisional: docs/DESIGN.md wants a simplified mark drawn on purpose at
     * these sizes and none exists yet (§14 still-open 1). Re-running
     * `scripts/build-brand-assets.ts` replaces them.
     */
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        { url: "/brand/icon-192.png", type: "image/png", sizes: "192x192" },
        { url: "/brand/icon-512.png", type: "image/png", sizes: "512x512" },
      ],
      apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
    },
    openGraph: {
      type: "website",
      siteName: general.siteName,
      locale,
      images: [{ url: DEFAULT_OG_IMAGE, width: OG_WIDTH, height: OG_HEIGHT }],
    },
  };
}

export const viewport: Viewport = sharedViewport;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  if (!(await isLocaleEnabled(locale))) notFound();

  setRequestLocale(locale);
  const t = await getTranslations("nav");

  /**
   * Theme tokens come from `settings.theme` and render as CSS custom properties
   * on <html> (docs/DESIGN.md). Tailwind v4 compiles every utility to
   * `var(--color-*)`, so redefining them here retunes the whole site with no
   * rebuild and no change to globals.css.
   */
  const theme = await getCachedSetting("theme");

  return (
    <html lang={locale} dir="ltr" style={themeStyle(theme)}>
      <head>
        <FontPreload />
      </head>
      <body>
        <NextIntlClientProvider>
          <SiteJsonLd />
          <a
            href="#content"
            className="sr-only rounded-(--radius-control) bg-(--color-brand) px-4 py-2.5 text-white focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50"
          >
            {t("skipToContent")}
          </a>
          <SiteHeader />
          {children}
          <SiteFooter />
          <ConsentGate />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
