import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { routing } from "./routing";

/**
 * Per-request i18n config.
 *
 * The catalogs hold UI chrome only — labels, buttons, empty states. Content
 * (product names, post bodies, the site name, the LINE button label) lives in
 * the `*_i18n` tables and in `settings`, never here, so translating the
 * interface and translating the catalog stay separate jobs.
 *
 * A locale with no catalog falls back to Thai rather than failing, mirroring
 * §6's rule for content: "a missing translation falls back to Thai and the page
 * is still valid".
 */
async function loadMessages(locale: string) {
  try {
    return (await import(`../../messages/${locale}.json`)).default as Record<string, unknown>;
  } catch {
    return (await import(`../../messages/${DEFAULT_LOCALE}.json`)).default as Record<
      string,
      unknown
    >;
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
    // Bangkok. Dates render identically on the server and the client, which is
    // what keeps a published-at line from hydration-mismatching.
    timeZone: "Asia/Bangkok",
  };
});
