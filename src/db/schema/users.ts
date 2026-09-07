import { boolean, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { userRole } from "./enums";
import { primaryId, timestamps } from "./shared";

/** Admin accounts only. There are no customer accounts (SPEC.md §2 non-goals). */
export const users = pgTable("users", {
  id: primaryId(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  /** Argon2id. Populated in phase 2 — nothing writes this yet. */
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRole("role").notNull().default("editor"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});
