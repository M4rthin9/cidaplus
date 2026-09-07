import { boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

/**
 * Postgres 16 has no `uuidv7()` — it landed in PG18 — and `pg_uuidv7` is not in
 * the postgres:16-alpine image. Ids are therefore generated application-side.
 * Keep this the only place that decides, so a future PG upgrade is one edit.
 */
export const primaryId = () =>
  varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => uuidv7());

/** Every table carries these. SPEC.md §6. */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Soft delete, on categories / products / posts / media only. */
export const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

/**
 * Marks rows created by `pnpm db:seed` so the admin can purge them in one click
 * from /admin/settings/general (SPEC.md §7).
 */
export const seedFlag = {
  isSeed: boolean("is_seed").notNull().default(false),
};
