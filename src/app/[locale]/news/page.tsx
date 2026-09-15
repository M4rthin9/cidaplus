import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PAGE_SIZE, publishedPosts } from "@/lib/public/queries";
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
  const t = await getTranslations({ locale, namespace: "news" });
  return publicMetadata({ locale, paths: "/news", title: t("title") });
}

export default async function NewsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { page: pageParam } = await searchParams;
  const page = Number.isInteger(Number(pageParam)) && Number(pageParam) > 0 ? Number(pageParam) : 1;

  const t = await getTranslations("news");
  const tNav = await getTranslations("nav");
  const { items, total } = await publishedPosts(locale, "news", page);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages && total > 0) notFound();

  const hrefFor = (target: number) => (target > 1 ? `/news?page=${target}` : "/news");

  return (
    <main
      id="content"
      className="storefront-page mx-auto max-w-(--container-site) px-4 py-12 md:px-6"
    >
      <Breadcrumbs items={[{ href: "/", label: tNav("home") }, { label: t("title") }]} />

      <SectionHeading as="h1">{t("title")}</SectionHeading>

      <section aria-labelledby="news-list" className="mt-8">
        {/* The outline needs a level between the page title and each article's h3. */}
        <h2 id="news-list" className="sr-only">
          {t("listLabel")}
        </h2>
        {items.length > 0 ? (
          <PostCardList posts={items} />
        ) : (
          <p className="text-(--color-text-muted)">{t("empty")}</p>
        )}
      </section>

      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
    </main>
  );
}
