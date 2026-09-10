import { SiteFooterView } from "./site-footer-view";
import { getLocale, getTranslations } from "next-intl/server";
import { getCachedSetting } from "@/lib/settings/cached";
import { publishedCategories } from "@/lib/public/queries";
import { getMenuItems } from "@/lib/menus/store";
import type { MenuItems } from "@/lib/menus/schema";
import { goLinePath } from "@/lib/line";

/**
 * Footer. docs/DESIGN.md section 9 of the layout reference, plus the two
 * questions §14 raised about the seal and answered here:
 *
 *  - The affiliation is stated as a **credit line**, not a link. An outbound
 *    link on every page would send visitors to the parent agency from the
 *    footer, and a link is a stronger claim than a credit.
 *  - Phone, address and LINE carry **equal weight**. A public-sector body
 *    cannot make a chat app the only way to reach it — a visitor without a LINE
 *    account would have no channel at all.
 *
 * The crimson band is one of crimson's four sanctioned jobs (docs/DESIGN.md).
 */
export async function SiteFooter() {
  const locale = await getLocale();
  const tNav = await getTranslations("nav");

  const [general, contact, line, categories, menuA, menuB] = await Promise.all([
    getCachedSetting("general", locale),
    getCachedSetting("contact", locale),
    getCachedSetting("line", locale),
    publishedCategories(locale),
    getMenuItems("footer_a", locale),
    getMenuItems("footer_b", locale),
  ]);

  /** As in the header: the shipped default until a menu is saved. */
  const defaultLinks: MenuItems = [
    {
      id: "categories",
      label: tNav("categories"),
      href: "/categories",
      target: "self",
      children: [],
    },
    ...categories.slice(0, 4).map((category) => ({
      id: category.id,
      label: category.name,
      href: `/category/${category.slug}`,
      target: "self" as const,
      children: [],
    })),
    { id: "news", label: tNav("news"), href: "/news", target: "self", children: [] },
  ];

  return (
    <SiteFooterView
      general={general}
      contact={contact}
      line={line}
      links={menuA ?? defaultLinks}
      extraLinks={menuB}
      lineHref={goLinePath()}
    />
  );
}
