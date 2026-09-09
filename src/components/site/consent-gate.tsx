import { getLocale } from "next-intl/server";
import { getCachedSetting } from "@/lib/settings/cached";
import { ConsentBanner } from "./consent-banner";

/**
 * PDPA cookie consent (SPEC.md §10: "analytics scripts load only after
 * consent").
 *
 * The gate is a server component so the measurement ids come from
 * `settings.seo` rather than from a client bundle, and so the banner is not
 * rendered at all when there is nothing to consent to — a site with no
 * analytics configured has no cookies to warn about, and a banner that asks
 * permission for nothing trains people to dismiss banners.
 */
export async function ConsentGate() {
  const locale = await getLocale();
  const seo = await getCachedSetting("seo", locale);

  if (!seo.ga4Id && !seo.gtmId) return null;

  return <ConsentBanner ga4Id={seo.ga4Id ?? null} gtmId={seo.gtmId ?? null} />;
}
