import { jsonb, pgTable, primaryKey, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Sentinel for a setting that applies to every locale.
 *
 * SPEC.md §6 describes this as `locale = NULL`, but Postgres forces every
 * primary-key column NOT NULL, so `PK(key, locale)` with a nullable locale
 * cannot exist. A sentinel keeps the primary key real, keeps lookups a plain
 * equality, and avoids the NULL-never-equals-NULL trap that would silently
 * allow duplicate rows under a unique index.
 */
export const GLOBAL_LOCALE = "*";

/**
 * Backing store for the typed settings registry (SPEC.md §6). Not a loose bag:
 * phase 6 defines one Zod schema per key with defaults, so a missing row falls
 * back rather than crashing. Structural settings (theme, analytics) use
 * GLOBAL_LOCALE; user-visible copy is stored per locale.
 */
export const settings = pgTable(
  "settings",
  {
    key: varchar("key", { length: 64 }).notNull(),
    locale: varchar("locale", { length: 16 }).notNull().default(GLOBAL_LOCALE),
    value: jsonb("value").notNull(),
    updatedBy: varchar("updated_by", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.key, t.locale] })],
);
