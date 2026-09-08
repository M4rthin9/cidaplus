import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { loginSchema } from "@/lib/validation/user";
import { authConfig } from "./config";
import { CLEARED, isLocked, registerFailure } from "./lockout";
import { burnTimingBudget, verifyPassword } from "./password";

/**
 * Node-runtime Auth.js instance. Imported by server components, server actions
 * and the route handler — never by the middleware, which uses `./config`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },

      /**
       * Authoritative. Returns null for every failure mode so Auth.js emits one
       * indistinguishable error; the login action re-reads lockout state to
       * decide which Thai message the operator sees.
       */
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) {
          await burnTimingBudget();
          return null;
        }
        const { email, password } = parsed.data;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user) {
          // Same CPU cost as a real verify, so response time cannot enumerate accounts.
          await burnTimingBudget();
          await writeAudit(db, {
            userId: null,
            entity: "auth",
            entityId: null,
            action: "login.failure",
            diff: { email, reason: "unknown_email" },
          });
          return null;
        }

        const now = new Date();

        if (isLocked(user, now)) {
          await writeAudit(db, {
            userId: user.id,
            entity: "auth",
            entityId: user.id,
            action: "login.locked",
            diff: { email, lockedUntil: user.lockedUntil?.toISOString() ?? null },
          });
          return null;
        }

        const ok = await verifyPassword(user.passwordHash, password);

        if (!ok) {
          const next = registerFailure(user, now);
          await db
            .update(users)
            .set({
              failedLoginAttempts: next.failedLoginAttempts,
              lockedUntil: next.lockedUntil,
            })
            .where(eq(users.id, user.id));

          await writeAudit(db, {
            userId: user.id,
            entity: "auth",
            entityId: user.id,
            action: next.justLocked ? "login.locked" : "login.failure",
            diff: {
              email,
              attempts: next.failedLoginAttempts,
              lockedUntil: next.lockedUntil?.toISOString() ?? null,
            },
          });
          return null;
        }

        // A correct password on a deactivated account is still a refusal, and
        // the counter is cleared so a reactivated user is not stuck locked.
        if (!user.isActive) {
          await db.update(users).set(CLEARED).where(eq(users.id, user.id));
          await writeAudit(db, {
            userId: user.id,
            entity: "auth",
            entityId: user.id,
            action: "login.failure",
            diff: { email, reason: "inactive" },
          });
          return null;
        }

        await db
          .update(users)
          .set({ ...CLEARED, lastLoginAt: now })
          .where(eq(users.id, user.id));

        await writeAudit(db, {
          userId: user.id,
          entity: "auth",
          entityId: user.id,
          action: "login.success",
          diff: { email },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
});
