import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { SettingValue } from "@/lib/settings/registry";
import type { EnabledLocale } from "@/lib/public/locales";
import type { MenuItems } from "@/lib/menus/schema";
import { Seal } from "./seal";
import { SiteNav } from "./site-nav";

/** Shared presentation for the real storefront and its isolated design preview. */
export function SiteHeaderView({
  general,
  contact,
  line,
  locales,
  items,
  lineHref,
  pathsByLocale,
}: {
  general: SettingValue<"general">;
  contact: SettingValue<"contact">;
  line: SettingValue<"line">;
  locales: EnabledLocale[];
  items: MenuItems;
  lineHref: string;
  pathsByLocale?: Record<string, string>;
}) {
  const t = useTranslations("nav");
  const tLine = useTranslations("line");
  const tContact = useTranslations("contact");
  return (
    <header className="site-header sticky top-0 z-30 border-b border-(--color-border)">
      <div className="site-utility">
        <div className="mx-auto flex max-w-(--container-site) flex-wrap items-center justify-end gap-x-5 gap-y-1 px-4 py-1.5 text-[13px] md:px-6">
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

      <div className="site-header-main site-shell flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
        <Link href="/" className="site-logo flex items-center gap-3">
          <Seal size={56} />
          <span className="flex flex-col">
            <span className="site-logo-name font-semibold text-(--color-heading)">
              {general.siteName}
            </span>
            {general.organisation && (
              <span className="site-logo-organisation text-[13px] text-(--color-text-muted)">
                {general.organisation}
              </span>
            )}
          </span>
          <span className="sr-only">{t("home")}</span>
        </Link>

        <div className="site-nav-wrap ms-auto flex flex-wrap items-center justify-end gap-x-6 gap-y-3">
          <SiteNav
            items={items}
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
