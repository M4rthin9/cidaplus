import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCachedSetting } from "@/lib/settings/cached";
import { publishedCategories } from "@/lib/public/queries";
import { addFriendUrl } from "@/lib/line";
import { Seal } from "./seal";
import { LineLink } from "./line-link";

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
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const tContact = await getTranslations("contact");
  const tLine = await getTranslations("line");

  const [general, contact, line, categories] = await Promise.all([
    getCachedSetting("general", locale),
    getCachedSetting("contact", locale),
    getCachedSetting("line", locale),
    publishedCategories(locale),
  ]);

  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-(--color-border) bg-(--color-surface)">
      <div className="mx-auto grid max-w-(--container-site) gap-10 px-4 py-12 md:grid-cols-2 md:px-6 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
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
            <li>
              <Link href="/categories" className="text-(--color-text) hover:text-(--color-brand)">
                {tNav("categories")}
              </Link>
            </li>
            {categories.slice(0, 4).map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/category/${category.slug}`}
                  className="text-(--color-text) hover:text-(--color-brand)"
                >
                  {category.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/news" className="text-(--color-text) hover:text-(--color-brand)">
                {tNav("news")}
              </Link>
            </li>
          </ul>
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
          <LineLink href={addFriendUrl(line.oaId)} className="mt-3">
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
      <div className="bg-(--color-brand) text-white">
        <div className="mx-auto flex max-w-(--container-site) flex-col gap-1 px-4 py-5 text-sm md:flex-row md:items-center md:justify-between md:px-6">
          <p>{general.organisation ?? t("ministry")}</p>
          <p className="text-white/85">{t("copyright", { year, name: general.siteName })}</p>
        </div>
      </div>
    </footer>
  );
}
