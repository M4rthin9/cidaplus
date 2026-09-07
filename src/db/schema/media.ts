import { integer, pgTable, primaryKey, text, varchar } from "drizzle-orm/pg-core";
import { localeColumn } from "./locales";
import { users } from "./users";
import { primaryId, seedFlag, softDelete, timestamps } from "./shared";

/**
 * The media library. The derivative pipeline (AVIF/WebP/JPEG at 400/800/1600px,
 * blurhash) is phase 3 — this table is its destination, nothing writes it yet.
 */
export const media = pgTable("media", {
  id: primaryId(),
  filename: varchar("filename", { length: 255 }).notNull(),
  storageKey: varchar("storage_key", { length: 512 }).notNull().unique(),
  mime: varchar("mime", { length: 128 }).notNull(),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes").notNull(),
  tags: text("tags").array().notNull().default([]),
  blurhash: varchar("blurhash", { length: 128 }),
  uploadedBy: varchar("uploaded_by", { length: 36 }).references(() => users.id, {
    onDelete: "set null",
  }),
  ...seedFlag,
  ...softDelete,
  ...timestamps,
});

/** Alt text is translatable and required before publish (SPEC.md §9). */
export const mediaI18n = pgTable(
  "media_i18n",
  {
    mediaId: varchar("media_id", { length: 36 })
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    locale: localeColumn(),
    alt: text("alt").notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.mediaId, t.locale] })],
);
