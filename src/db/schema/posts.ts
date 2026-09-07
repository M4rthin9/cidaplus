import {
  boolean,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { postType } from "./enums";
import { localeColumn } from "./locales";
import { media } from "./media";
import { users } from "./users";
import { primaryId, seedFlag, softDelete, timestamps } from "./shared";

export const posts = pgTable("posts", {
  id: primaryId(),
  type: postType("type").notNull().default("news"),
  coverMediaId: varchar("cover_media_id", { length: 36 }).references(() => media.id, {
    onDelete: "set null",
  }),
  eventStartAt: timestamp("event_start_at", { withTimezone: true }),
  eventEndAt: timestamp("event_end_at", { withTimezone: true }),
  eventLocation: varchar("event_location", { length: 255 }),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  /**
   * Nullable: seeded and imported posts have no author, and deleting an admin
   * must not delete the site's news archive. Phase 2 sets this on new posts.
   */
  authorId: varchar("author_id", { length: 36 }).references(() => users.id, {
    onDelete: "set null",
  }),
  ...seedFlag,
  ...softDelete,
  ...timestamps,
});

export const postI18n = pgTable(
  "post_i18n",
  {
    postId: varchar("post_id", { length: 36 })
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    locale: localeColumn(),
    slug: varchar("slug", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    excerpt: text("excerpt"),
    body: jsonb("body"),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.locale] }),
    unique("post_i18n_locale_slug_key").on(t.locale, t.slug),
  ],
);
