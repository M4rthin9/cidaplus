import { boolean, integer, pgTable, primaryKey, text, varchar } from "drizzle-orm/pg-core";
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

  /**
   * Focal point as whole percentages of the source image, seeded by sharp's
   * attention detector and editable by the operator.
   *
   * §9 asked for a destructive crop to 3:4 / 16:9 "before saving", but `media`
   * is a shared library — the same photograph can be a product image and a post
   * cover at once, and a stored crop locks it to one aspect forever. Instead one
   * derivative set is kept at the natural aspect and the consumer crops with
   * object-fit: cover plus object-position built from these two numbers.
   * SPEC.md §14 decision 15.
   */
  focalX: integer("focal_x").notNull().default(50),
  focalY: integer("focal_y").notNull().default(50),

  /**
   * False when the upload exceeded the retention threshold and the original was
   * dropped to save disk (SPEC.md §2). A capped master is always kept, so
   * derivatives can be regenerated either way.
   */
  originalKept: boolean("original_kept").notNull().default(false),
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
