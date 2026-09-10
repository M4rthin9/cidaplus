import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PAGE_SIZE, publishedPosts } from "@/lib/public/queries";
import { publicMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Pagination } from "@/components/site/pagination";
import { PostCardList } from "@/components/site/post-card";
import { SectionHeading } from "@/components/site/section-heading";

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; type?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "news" });
  return publicMetadata({ locale, paths: "/news", title: t("title") });
}

export default async function NewsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { page: pageParam, type: typeParam } = await searchParams;
  const page = Number.isInteger(Number(pageParam)) && Number(pageParam) > 0 ? Number(pageParam) : 1;
  const type = typeParam === "news" || typeParam === "event" ? typeParam : null;

  const t = await getTranslations("news");
  const tNav = await getTranslations("nav");
  const { items, total } = await publishedPosts(locale, type, page);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages && total > 0) notFound();

  const filters: { value: "news" | "event" | null; label: string }[] = [
    { value: null, label: t("all") },
    { value: "news", label: t("news") },
    { value: "event", label: t("event") },
  ];

  const hrefFor = (target: number) => {
    const query = new URLSearchParams();
    if (target > 1) query.set("page", String(target));
    if (type) query.set("type", type);
    const qs = query.toString();
    return `/news${qs ? `?${qs}` : ""}`;
  };

  return (
    <main
      id="content"
      className="storefront-page mx-auto max-w-(--container-site) px-4 py-12 md:px-6"
    >
      <Breadcrumbs items={[{ href: "/", label: tNav("home") }, { label: t("title") }]} />

      <SectionHeading
        action={
          <nav aria-label={t("title")} className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const active = filter.value === type;
              return (
                <Link
                  key={filter.label}
                  href={filter.value ? `/news?type=${filter.value}` : "/news"}
                  aria-current={active ? "true" : undefined}
                  className={
                    active
                      ? "rounded-(--radius-control) bg-(--color-brand-tint) px-3 py-1.5 text-sm font-medium text-(--color-brand)"
                      : "rounded-(--radius-control) px-3 py-1.5 text-sm text-(--color-text) hover:text-(--color-brand)"
                  }
                >
                  {filter.label}
                </Link>
              );
            })}
          </nav>
        }
      >
        {t("title")}
      </SectionHeading>

      <div className="mt-8">
        {items.length > 0 ? (
          <PostCardList posts={items} />
        ) : (
          <p className="text-(--color-text-muted)">{t("empty")}</p>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
    </main>
  );
}
