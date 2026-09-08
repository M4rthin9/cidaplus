import type { MetadataRoute } from "next";
import { assertEnv } from "@/lib/env";
import { getSetting } from "@/lib/settings/store";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { siteOrigin } from "@/lib/seo/urls";

/**
 * `robots.txt`. SPEC.md §5 and §10.
 *
 * `settings.seo.allowIndexing` is the switch, and it ships off: a catalog with
 * placeholder photography and no English translations should not be in an index
 * before anyone decides it is ready. While it is off this refuses everything and
 * omits the `Sitemap:` line, so a crawler is neither invited nor pointed at a
 * list of URLs it has been told not to fetch.
 */
export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = siteOrigin(assertEnv().NEXT_PUBLIC_SITE_URL);
  const seo = await getSetting("seo", DEFAULT_LOCALE);

  if (!seo.allowIndexing) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        /**
         * `/admin` is behind auth and `/api` is not content. `/go/line` is a
         * tracked redirect — a crawler following it would write `line_clicks`
         * rows that look like enquiries and corrupt the only conversion signal
         * the business has (§8 item 5).
         */
        disallow: ["/admin", "/api/", "/go/line", "/search"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
