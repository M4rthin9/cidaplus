import { useTranslations } from "next-intl";
import type { SettingValue } from "@/lib/settings/registry";
import type { MenuItems } from "@/lib/menus/schema";
import { MenuLink } from "./menu-link";
import { Seal } from "./seal";
import { LineLink } from "./line-link";

export function SiteFooterView({
  general,
  contact,
  line,
  links,
  extraLinks,
  lineHref,
}: {
  general: SettingValue<"general">;
  contact: SettingValue<"contact">;
  line: SettingValue<"line">;
  links: MenuItems;
  extraLinks?: MenuItems | null;
  lineHref: string;
}) {
  const t = useTranslations("footer");
  const tContact = useTranslations("contact");
  const tLine = useTranslations("line");
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="mx-auto grid max-w-(--container-site) gap-10 px-4 py-12 md:grid-cols-2 md:px-6 lg:grid-cols-4">
        <div className="site-footer-brand">
          <div className="flex items-center gap-3 rounded-(--radius-card) bg-(--color-bg) p-3">
            <Seal size={48} />
            <span className="text-sm font-semibold text-(--color-heading)">{general.siteName}</span>
          </div>
          {general.tagline && <p className="mt-4 text-sm text-(--color-text)">{general.tagline}</p>}
        </div>

        <nav aria-labelledby="footer-links">
          <h2 id="footer-links" className="text-sm font-semibold text-(--color-heading)">
            {t("links")}
          </h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {links.map((item) => (
              <li key={item.id}>
                <MenuLink item={item} className="text-(--color-text) hover:text-(--color-brand)" />
              </li>
            ))}
          </ul>

          {/* The second footer column only appears once the operator fills it. */}
          {extraLinks && extraLinks.length > 0 && (
            <ul className="mt-6 flex flex-col gap-2 text-sm">
              {extraLinks.map((item) => (
                <li key={item.id}>
                  <MenuLink
                    item={item}
                    className="text-(--color-text) hover:text-(--color-brand)"
                  />
                </li>
              ))}
            </ul>
          )}
        </nav>

        <section aria-labelledby="footer-contact">
          <h2 id="footer-contact" className="text-sm font-semibold text-(--color-heading)">
            {t("contact")}
          </h2>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            {contact.phone && (
              <div>
                <dt className="text-(--color-text-muted)">{tContact("phone")}</dt>
                <dd>
                  <a
                    href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                    className="lat text-(--color-brand) hover:text-(--color-brand-hover)"
                  >
                    {contact.phone}
                  </a>
                </dd>
              </div>
            )}
            {contact.email && (
              <div>
                <dt className="text-(--color-text-muted)">{tContact("email")}</dt>
                <dd>
                  <a
                    href={`mailto:${contact.email}`}
                    className="lat text-(--color-brand) hover:text-(--color-brand-hover)"
                  >
                    {contact.email}
                  </a>
                </dd>
              </div>
            )}
            {general.address && (
              <div>
                <dt className="text-(--color-text-muted)">{tContact("address")}</dt>
                <dd className="text-(--color-text)">{general.address}</dd>
              </div>
            )}
            {general.businessHours && (
              <div>
                <dt className="text-(--color-text-muted)">{tContact("hours")}</dt>
                <dd className="text-(--color-text)">{general.businessHours}</dd>
              </div>
            )}
          </dl>
        </section>

        <section aria-labelledby="footer-line">
          <h2 id="footer-line" className="text-sm font-semibold text-(--color-heading)">
            {tLine("sectionTitle")}
          </h2>
          <p className="lat mt-4 text-sm text-(--color-text)">
            {tLine("handle", { id: line.oaId })}
          </p>
          <LineLink href={lineHref} className="mt-3">
            {tLine("openAccount")}
          </LineLink>

          {(contact.facebookUrl ?? contact.youtubeUrl) && (
            <ul className="mt-5 flex flex-col gap-2 text-sm">
              {contact.facebookUrl && (
                <li>
                  <a
                    href={contact.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-(--color-brand) hover:text-(--color-brand-hover)"
                  >
                    {t("facebook")}
                  </a>
                </li>
              )}
              {contact.youtubeUrl && (
                <li>
                  <a
                    href={contact.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-(--color-brand) hover:text-(--color-brand-hover)"
                  >
                    {t("youtube")}
                  </a>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>

      {/*
       * The affiliation band. Text, not a link (see the note at the top of this
       * file). White on --color-brand is 9.9:1.
       */}
      <div className="site-footer-credit">
        <div className="mx-auto flex max-w-(--container-site) flex-col gap-1 px-4 py-5 text-sm md:flex-row md:items-center md:justify-between md:px-6">
          <p>{general.organisation ?? t("ministry")}</p>
          <p className="text-white/85">{t("copyright", { year, name: general.siteName })}</p>
        </div>
      </div>
    </footer>
  );
}
