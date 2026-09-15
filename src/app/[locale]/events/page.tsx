import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PAGE_SIZE, pastEvents, upcomingEvents } from "@/lib/public/queries";
import { publicMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Pagination } from "@/components/site/pagination";
import { PostCardList } from "@/components/site/post-card";
import { SectionHeading } from "@/components/site/section-heading";

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events" });
  return publicMetadata({ locale, paths: "/events", title: t("title") });
}

/**
 * Events, upcoming first and past below. The split is computed in SQL from the
 * event's own dates (see `upcomingEvents` / `pastEvents`), so nothing here has
 * to be told that an event is over.
 *
 * Only the past list paginates. Upcoming is a short, complete list — a visitor
 * wants to see everything that is still ahead of them, and paging it would hide
 * the furthest-out event behind a click for no benefit.
 */
export default async function EventsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { page: pageParam } = await searchParams;
  const page = Number.isInteger(Number(pageParam)) && Number(pageParam) > 0 ? Number(pageParam) : 1;

  const t = await getTranslations("events");
  const tNav = await getTranslations("nav");

  const [upcoming, past] = await Promise.all([upcomingEvents(locale), pastEvents(locale, page)]);

  const totalPages = Math.max(1, Math.ceil(past.total / PAGE_SIZE));
  if (page > totalPages && past.total > 0) notFound();

  const hrefFor = (target: number) => (target > 1 ? `/events?page=${target}` : "/events");

  return (
    <main
      id="content"
      className="storefront-page mx-auto max-w-(--container-site) px-4 py-12 md:px-6"
    >
      <Breadcrumbs items={[{ href: "/", label: tNav("home") }, { label: t("title") }]} />

      <SectionHeading>{t("upcoming")}</SectionHeading>
      <div className="mt-8">
        {upcoming.length > 0 ? (
          <PostCardList posts={upcoming} />
        ) : (
          <p className="text-(--color-text-muted)">{t("emptyUpcoming")}</p>
        )}
      </div>

      <section className="mt-16">
        <SectionHeading>{t("past")}</SectionHeading>
        <div className="mt-8">
          {past.items.length > 0 ? (
            <PostCardList posts={past.items} />
          ) : (
            <p className="text-(--color-text-muted)">{t("emptyPast")}</p>
          )}
        </div>
        <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
      </section>
    </main>
  );
}
