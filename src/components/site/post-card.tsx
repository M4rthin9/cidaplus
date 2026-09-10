import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MediaThumb } from "@/components/media/media-thumb";
import { SiteIcon } from "./icons";
import type { PostCardData } from "@/lib/public/queries";

/**
 * News / activities card (docs/DESIGN.md section 8): 16:9 cover, title, excerpt.
 *
 * An event shows its start date rather than its publication date — that is the
 * date a reader is looking for.
 */
export function PostCard({ post }: { post: PostCardData }) {
  const t = useTranslations("news");
  const format = useFormatter();
  const date = post.type === "event" ? (post.eventStartAt ?? post.publishedAt) : post.publishedAt;

  return (
    <article className="post-card group">
      <Link
        href={`/news/${post.slug}`}
        className="block rounded-(--radius-card) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--color-brand)"
      >
        {post.cover && (
          <div className="overflow-hidden rounded-(--radius-card) border border-(--color-border) transition-colors group-hover:border-(--color-heading)/15">
            <MediaThumb
              media={post.cover}
              aspect="cover"
              width={800}
              sizes="(max-width: 768px) 100vw, 380px"
              className="rounded-none border-0 transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </div>
        )}

        <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-(--color-text-muted)">
          <span className="rounded-(--radius-control) bg-(--color-brand-tint) px-2 py-0.5 text-(--color-brand)">
            {post.type === "event" ? t("event") : t("news")}
          </span>
          {date && (
            <time dateTime={date.toISOString()}>
              {format.dateTime(date, { dateStyle: "long" })}
            </time>
          )}
        </p>

        <h3 className="mt-2 line-clamp-2 text-lg font-medium text-(--color-heading)">
          {post.title}
        </h3>

        {post.excerpt && (
          <p className="post-card-excerpt mt-2 line-clamp-3 text-(--color-text)">{post.excerpt}</p>
        )}
        <span className="post-readmore">
          {t("readMore")} <SiteIcon name="arrow" />
        </span>
      </Link>
    </article>
  );
}

export function PostCardList({ posts }: { posts: PostCardData[] }) {
  return (
    <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <li key={post.id}>
          <PostCard post={post} />
        </li>
      ))}
    </ul>
  );
}
