import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { bodyMedia, postBySlug } from "@/lib/public/queries";
import { assertEnv } from "@/lib/env";
import { getCachedSetting } from "@/lib/settings/cached";
import { ogImageForStorageKey, publicMetadata } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbJsonLd, eventJsonLd } from "@/lib/seo/jsonld";
import { RichText } from "@/lib/richtext/render";
import { postPath } from "@/lib/slug";
import { MediaThumb } from "@/components/media/media-thumb";
import { Breadcrumbs } from "@/components/site/breadcrumbs";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await postBySlug(locale, decodeURIComponent(slug));
  if (!post || post.type !== "event") return {};

  return publicMetadata({
    locale,
    paths: Object.fromEntries(
      Object.entries(post.slugsByLocale).map(([code, s]) => [code, `/events/${s}`]),
    ),
    title: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover ? ogImageForStorageKey(post.cover.storageKey, post.cover.width) : undefined,
    type: "article",
    publishedTime: post.publishedAt,
  });
}

export default async function EventPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const decoded = decodeURIComponent(slug);
  const post = await postBySlug(locale, decoded);
  if (!post) notFound();

  /**
   * News and events share one slug namespace, so a news slug typed under
   * /events resolves here. Send it to its own section rather than rendering it
   * at a URL that is not its canonical one — two URLs serving one article is
   * exactly what the canonical tag and the sitemap exist to prevent.
   */
  if (post.type !== "event") redirect(postPath(locale, post.slug));

  const t = await getTranslations("events");
  const tNav = await getTranslations("nav");
  const format = await getFormatter();
  const media = await bodyMedia(post.body, locale);
  const base = assertEnv().NEXT_PUBLIC_SITE_URL;
  const general = await getCachedSetting("general", locale);

  const ends = post.eventEndAt ?? post.eventStartAt;
  const isPast = ends ? ends.getTime() < Date.now() : false;

  return (
    <main
      id="content"
      className="storefront-page mx-auto max-w-(--container-site) px-4 py-12 md:px-6"
    >
      <JsonLd
        data={[
          ...(post.eventStartAt
            ? [
                eventJsonLd({
                  base,
                  locale,
                  name: post.title,
                  description: post.excerpt ?? undefined,
                  path: `/events/${post.slug}`,
                  image: post.cover
                    ? ogImageForStorageKey(post.cover.storageKey, post.cover.width)
                    : undefined,
                  startAt: post.eventStartAt,
                  endAt: post.eventEndAt,
                  location: post.eventLocation,
                  siteName: general.siteName,
                }),
              ]
            : []),
          breadcrumbJsonLd(base, locale, [
            { name: tNav("home"), path: "/" },
            { name: t("title"), path: "/events" },
            { name: post.title, path: `/events/${post.slug}` },
          ]),
        ]}
      />

      <Breadcrumbs
        items={[
          { href: "/", label: tNav("home") },
          { href: "/events", label: t("title") },
          { label: post.title },
        ]}
      />

      <article className="mx-auto max-w-prose">
        <p className="flex flex-wrap items-center gap-2 text-[13px] text-(--color-text-muted)">
          <span className="rounded-(--radius-control) bg-(--color-brand-tint) px-2 py-0.5 text-(--color-brand)">
            {t("title")}
          </span>
          {isPast && (
            <span className="rounded-(--radius-control) bg-(--color-surface-alt) px-2 py-0.5">
              {t("pastBadge")}
            </span>
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

        {(post.eventStartAt ?? post.eventLocation) && (
          <dl className="mt-8 divide-y divide-(--color-border) border-y border-(--color-border) text-sm">
            {post.eventStartAt && (
              <div className="grid grid-cols-3 gap-4 py-3">
                <dt className="text-(--color-text-muted)">{t("date")}</dt>
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
                <dt className="text-(--color-text-muted)">{t("location")}</dt>
                <dd className="col-span-2 text-(--color-text)">{post.eventLocation}</dd>
              </div>
            )}
          </dl>
        )}

        {/*
         * The registration link is only offered while the event is still ahead:
         * sending someone to a closed form is worse than not offering it. The
         * URL is validated as http(s) on write (validation/url.ts), and carries
         * rel="noopener noreferrer" because — unlike /go/line — this really is
         * someone else's origin.
         */}
        {post.externalUrl && !isPast && (
          <p className="mt-8">
            <a
              href={post.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-(--radius-control) bg-(--color-brand) px-5 py-3 font-medium text-white hover:bg-(--color-brand-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand)"
            >
              {t("register")}
            </a>
            <span className="mt-2 block text-xs text-(--color-text-muted)">
              {t("registerHint")}
            </span>
          </p>
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
          href="/events"
          className="text-sm text-(--color-brand) hover:text-(--color-brand-hover)"
        >
          {t("backToIndex")}
        </Link>
      </p>
    </main>
  );
}
