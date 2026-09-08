import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { bodyMedia, postBySlug } from "@/lib/public/queries";
import { RichText } from "@/lib/richtext/render";
import { MediaThumb } from "@/components/media/media-thumb";
import { Breadcrumbs } from "@/components/site/breadcrumbs";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await postBySlug(locale, decodeURIComponent(slug));
  if (!post) return {};
  return { title: post.title, description: post.excerpt ?? undefined };
}

export default async function PostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await postBySlug(locale, decodeURIComponent(slug));
  if (!post) notFound();

  const t = await getTranslations("news");
  const tNav = await getTranslations("nav");
  const format = await getFormatter();
  const media = await bodyMedia(post.body, locale);

  return (
    <main id="content" className="mx-auto max-w-(--container-site) px-4 py-12 md:px-6">
      <Breadcrumbs
        items={[
          { href: "/", label: tNav("home") },
          { href: "/news", label: t("title") },
          { label: post.title },
        ]}
      />

      <article className="mx-auto max-w-prose">
        <p className="flex flex-wrap items-center gap-2 text-[13px] text-(--color-text-muted)">
          <span className="rounded-(--radius-control) bg-(--color-brand-tint) px-2 py-0.5 text-(--color-brand)">
            {post.type === "event" ? t("event") : t("news")}
          </span>
          {post.publishedAt && (
            <time dateTime={post.publishedAt.toISOString()}>
              {t("publishedOn", {
                date: format.dateTime(post.publishedAt, { dateStyle: "long" }),
              })}
            </time>
          )}
        </p>

        <h1 className="mt-3 text-3xl font-semibold md:text-[40px]">{post.title}</h1>
        <div className="mt-4 h-0.5 w-12 rounded-full bg-(--color-brand)" aria-hidden="true" />

        {post.cover && (
          <div className="mt-8">
            <MediaThumb
              media={post.cover}
              aspect="cover"
              width={1600}
              sizes="(max-width: 768px) 100vw, 720px"
            />
          </div>
        )}

        {post.type === "event" && (post.eventStartAt ?? post.eventLocation) && (
          <dl className="mt-8 divide-y divide-(--color-border) border-y border-(--color-border) text-sm">
            {post.eventStartAt && (
              <div className="grid grid-cols-3 gap-4 py-3">
                <dt className="text-(--color-text-muted)">{t("eventDate")}</dt>
                <dd className="col-span-2 text-(--color-text)">
                  <time dateTime={post.eventStartAt.toISOString()}>
                    {format.dateTime(post.eventStartAt, { dateStyle: "long" })}
                  </time>
                  {post.eventEndAt && (
                    <>
                      {" – "}
                      <time dateTime={post.eventEndAt.toISOString()}>
                        {format.dateTime(post.eventEndAt, { dateStyle: "long" })}
                      </time>
                    </>
                  )}
                </dd>
              </div>
            )}
            {post.eventLocation && (
              <div className="grid grid-cols-3 gap-4 py-3">
                <dt className="text-(--color-text-muted)">{t("eventLocation")}</dt>
                <dd className="col-span-2 text-(--color-text)">{post.eventLocation}</dd>
              </div>
            )}
          </dl>
        )}

        {post.excerpt && <p className="mt-8 text-lg text-(--color-text)">{post.excerpt}</p>}

        {post.body && (
          <div className="mt-8">
            <RichText doc={post.body} media={media} />
          </div>
        )}
      </article>

      <p className="mx-auto mt-12 max-w-prose">
        <Link
          href="/news"
          className="text-sm text-(--color-brand) hover:text-(--color-brand-hover)"
        >
          {t("backToIndex")}
        </Link>
      </p>
    </main>
  );
}
