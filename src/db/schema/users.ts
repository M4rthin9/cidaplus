import { boolean, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
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

  /**
   * Session revocation. Auth.js refuses database sessions with the credentials
   * provider (@auth/core asserts "Signing in with credentials only supported if
   * JWT strategy is enabled"), so sessions live in a signed cookie. Bumping this
   * invalidates every token already issued for the user, which is the one thing
   * database sessions were wanted for: deactivating an admin, a password change,
   * or an explicit sign-out-everywhere takes effect immediately.
   * SPEC.md §14 decision 13.
   */
  sessionVersion: integer("session_version").notNull().default(1),

  /**
   * Lockout state. Persisted rather than in-memory: an in-memory counter resets
   * on every container restart, which turns "locked out after 5 tries" into
   * "locked out until someone redeploys".
   */
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),

  ...timestamps,
});
