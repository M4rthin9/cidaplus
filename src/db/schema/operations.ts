import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { products } from "./products";
import { users } from "./users";
import { primaryId, timestamps } from "./shared";

/**
 * Contact form inbox. The row is written BEFORE any mail is attempted — losing
 * an enquiry is the worst failure this site can have (SPEC.md §9), so
 * `emailedAt` staying null is an expected state, not an error.
 */
export const contactMessages = pgTable("contact_messages", {
  id: primaryId(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 64 }),
  locale: varchar("locale", { length: 16 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  body: text("body").notNull(),
  sourcePath: varchar("source_path", { length: 512 }).notNull(),
  /** Salted hash, never a raw IP. The pepper is a secret (PDPA — SPEC.md §10). */
  ipHash: varchar("ip_hash", { length: 64 }),
  isRead: boolean("is_read").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every mutation writes one of these with a field-level diff (CLAUDE.md). */
export const auditLog = pgTable(
  "audit_log",
  {
    id: primaryId(),
    userId: varchar("user_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    entity: varchar("entity", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 36 }),
    /** Free text rather than an enum: extending a pg enum is a migration. */
    action: varchar("action", { length: 32 }).notNull(),
    diff: jsonb("diff"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entity, t.entityId)],
);

/**
 * The only conversion signal the business has (SPEC.md §8). No raw IP, no cookie.
 * Retention is enforced by the nightly cron — nothing reads past 30 days.
 */
export const lineClicks = pgTable(
  "line_clicks",
  {
    id: primaryId(),
    productId: varchar("product_id", { length: 36 }).references(() => products.id, {
      onDelete: "set null",
    }),
    locale: varchar("locale", { length: 16 }).notNull(),
    path: varchar("path", { length: 512 }).notNull(),
    referrer: varchar("referrer", { length: 512 }),
    uaHash: varchar("ua_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("line_clicks_created_idx").on(t.createdAt)],
);

/**
 * 301s written automatically when a published slug changes (SPEC.md §6, §9).
 * §6 never defines this table but two sections require it.
 */
export const redirects = pgTable(
  "redirects",
  {
    id: primaryId(),
    fromPath: varchar("from_path", { length: 512 }).notNull(),
    toPath: varchar("to_path", { length: 512 }).notNull(),
    locale: varchar("locale", { length: 16 }).notNull(),
    ...timestamps,
  },
  (t) => [unique("redirects_from_path_key").on(t.fromPath)],
);
