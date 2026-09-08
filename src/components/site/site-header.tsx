import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCachedSetting } from "@/lib/settings/cached";
import { enabledLocales } from "@/lib/public/locales";
import { alternatePaths, withoutLocalePrefix } from "@/lib/public/alternates";
import { LOCALES } from "@/i18n/routing";
import { publishedCategories } from "@/lib/public/queries";
import { goLinePath } from "@/lib/line";
import { Seal } from "./seal";
import { SiteNav } from "./site-nav";

/**
 * Utility bar plus the sticky header (docs/DESIGN.md, sections 1–2 of the
 * layout reference).
 *
 * The header is a **lockup**, not a scaled seal: the mark at a legible size
 * beside the institution name as live text. Shrinking the full seal to header
 * height turns its two rings of Thai microtext into grey noise, and the name
 * would not be selectable, translatable or resizable.
 *
 * Phone, email and LINE sit at the same weight — §14's open question about a
 * public-sector body's enquiry channels, answered in favour of equal prominence.
 */
export async function SiteHeader() {
  const locale = await getLocale();
  const t = await getTranslations("nav");
  const tLine = await getTranslations("line");
  const tContact = await getTranslations("contact");

  const [general, contact, line, locales, categories] = await Promise.all([
    getCachedSetting("general", locale),
    getCachedSetting("contact", locale),
    getCachedSetting("line", locale),
    enabledLocales(),
    publishedCategories(locale),
  ]);

  const lineHref = goLinePath();

  /**
   * The switcher needs each locale's own slug so it lands on the same product
   * (§5). Resolving that needs the request path, and reading `headers()` opts
   * the route out of static rendering — so it is only read when there is
   * actually a second locale to switch to. With Thai alone (§14 decision 9) the
   * call never happens and the public pages stay static.
   */
  let pathsByLocale: Record<string, string> | undefined;
  if (locales.length > 1) {
    const pathname = (await headers()).get("x-pathname") ?? "/";
    pathsByLocale = await alternatePaths(withoutLocalePrefix(pathname, LOCALES), locale);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-(--color-border) bg-(--color-bg)">
      <div className="border-b border-(--color-border) bg-(--color-surface)">
        <div className="mx-auto flex max-w-(--container-site) flex-wrap items-center justify-end gap-x-5 gap-y-1 px-4 py-1.5 text-[13px] text-(--color-text-muted) md:px-6">
          {contact.phone && (
            <a
              href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
              className="hover:text-(--color-brand)"
            >
              {tContact("phone")} <span className="lat">{contact.phone}</span>
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="hover:text-(--color-brand)">
              <span className="lat">{contact.email}</span>
            </a>
          )}
          <span className="lat">{tLine("handle", { id: line.oaId })}</span>
        </div>
      </div>

      <div className="mx-auto flex max-w-(--container-site) flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Seal size={56} />
          <span className="flex flex-col">
            <span className="text-base font-semibold text-(--color-heading) md:text-lg">
              {general.siteName}
            </span>
            {general.organisation && (
              <span className="text-[13px] text-(--color-text-muted)">{general.organisation}</span>
            )}
          </span>
          <span className="sr-only">{t("home")}</span>
        </Link>

        <div className="ms-auto flex w-full flex-wrap items-center justify-end gap-x-6 gap-y-3 lg:w-auto">
          <SiteNav
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
            locales={locales}
            lineHref={lineHref}
            lineLabel={tLine("openAccount")}
            pathsByLocale={pathsByLocale}
          />
        </div>
      </div>
    </header>
  );
}
