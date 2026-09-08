import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCachedSetting } from "@/lib/settings/cached";
import { publicMetadata } from "@/lib/seo/metadata";
import { goLinePath } from "@/lib/line";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { LineLink } from "@/components/site/line-link";
import { SectionHeading } from "@/components/site/section-heading";
import { ContactForm } from "./contact-form";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return publicMetadata({
    locale,
    paths: "/contact",
    title: t("title"),
    description: t("intro"),
  });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("contact");
  const tNav = await getTranslations("nav");
  const tLine = await getTranslations("line");

  const [general, contact, line] = await Promise.all([
    getCachedSetting("general", locale),
    getCachedSetting("contact", locale),
    getCachedSetting("line", locale),
  ]);

  return (
    <main id="content" className="mx-auto max-w-(--container-site) px-4 py-12 md:px-6">
      <Breadcrumbs items={[{ href: "/", label: tNav("home") }, { label: t("title") }]} />

      <h1 className="text-3xl font-semibold md:text-[40px]">{t("title")}</h1>
      <div className="mt-3 h-0.5 w-12 rounded-full bg-(--color-brand)" aria-hidden="true" />
      <p className="mt-6 max-w-prose text-(--color-text)">{t("intro")}</p>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        {/*
         * Phone, address and LINE at the same weight — a public-sector body
         * cannot make a chat app the only way to reach it (§14, raised by the
         * seal). The LINE block is one of the three, not the page's headline.
         */}
        <section aria-labelledby="contact-channels">
          <SectionHeading id="contact-channels">{t("channels")}</SectionHeading>

          <dl className="mt-8 divide-y divide-(--color-border) border-y border-(--color-border)">
            {contact.phone && (
              <div className="grid grid-cols-3 gap-4 py-4">
                <dt className="text-sm text-(--color-text-muted)">{t("phone")}</dt>
                <dd className="col-span-2">
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
              <div className="grid grid-cols-3 gap-4 py-4">
                <dt className="text-sm text-(--color-text-muted)">{t("email")}</dt>
                <dd className="col-span-2">
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
              <div className="grid grid-cols-3 gap-4 py-4">
                <dt className="text-sm text-(--color-text-muted)">{t("address")}</dt>
                <dd className="col-span-2 text-(--color-text)">{general.address}</dd>
              </div>
            )}
            {general.businessHours && (
              <div className="grid grid-cols-3 gap-4 py-4">
                <dt className="text-sm text-(--color-text-muted)">{t("hours")}</dt>
                <dd className="col-span-2 text-(--color-text)">{general.businessHours}</dd>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 py-4">
              <dt className="text-sm text-(--color-text-muted)">{t("line")}</dt>
              <dd className="col-span-2">
                <p className="lat text-(--color-text)">{tLine("handle", { id: line.oaId })}</p>
                <LineLink href={goLinePath()} className="mt-3">
                  {tLine("openAccount")}
                </LineLink>
              </dd>
            </div>
          </dl>

          {contact.mapEmbedUrl && (
            <div className="mt-10">
              <h2 className="text-xl font-medium">{t("map")}</h2>
              <div className="mt-4 overflow-hidden rounded-(--radius-card) border border-(--color-border)">
                <iframe
                  src={contact.mapEmbedUrl}
                  title={t("map")}
                  loading="lazy"
                  // The embed is operator-supplied; keep it sandboxed and
                  // referrer-free rather than trusting whatever URL was pasted.
                  referrerPolicy="no-referrer-when-downgrade"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  className="aspect-[16/9] w-full border-0"
                />
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="contact-form">
          <SectionHeading id="contact-form">{t("formTitle")}</SectionHeading>
          <div className="mt-8">
            <ContactForm privacyNote={contact.privacyNote ?? t("privacyDefault")} />
          </div>
        </section>
      </div>
    </main>
  );
}
