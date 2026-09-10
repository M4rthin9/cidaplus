import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { getCachedSetting } from "@/lib/settings/cached";
import { enabledLocales } from "@/lib/public/locales";
import { alternatePaths, withoutLocalePrefix } from "@/lib/public/alternates";
import { LOCALES } from "@/i18n/routing";
import { publishedCategories } from "@/lib/public/queries";
import { getMenuItems } from "@/lib/menus/store";
import type { MenuItems } from "@/lib/menus/schema";
import { goLinePath } from "@/lib/line";
import { SiteHeaderView } from "./site-header-view";

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

  const [general, contact, line, locales, categories, savedMenu] = await Promise.all([
    getCachedSetting("general", locale),
    getCachedSetting("contact", locale),
    getCachedSetting("line", locale),
    enabledLocales(),
    publishedCategories(locale),
    getMenuItems("header", locale),
  ]);

  /**
   * The shipped default, used until the operator saves a header menu at
   * `/admin/menus`. It carries the live category list as children, which a
   * hand-written menu cannot — so an operator who wants an automatic category
   * dropdown gets it by leaving the menu alone, and one who wants a fixed order
   * gets it by saving one. Saving even a single item takes over completely.
   */
  const defaultMenu: MenuItems = [
    { id: "home", label: t("home"), href: "/", target: "self", children: [] },
    {
      id: "categories",
      label: t("categories"),
      href: "/categories",
      target: "self",
      children: categories.map((category) => ({
        id: category.id,
        label: category.name,
        href: `/category/${category.slug}`,
        target: "self" as const,
      })),
    },
    { id: "news", label: t("news"), href: "/news", target: "self", children: [] },
    { id: "contact", label: t("contact"), href: "/contact", target: "self", children: [] },
  ];

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
    <SiteHeaderView
      general={general}
      contact={contact}
      line={line}
      locales={locales}
      items={savedMenu ?? defaultMenu}
      lineHref={lineHref}
      pathsByLocale={pathsByLocale}
    />
  );
}
