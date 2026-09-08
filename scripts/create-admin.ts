/**
 * Bootstrap the first admin. Documented in RUNBOOK.md at phase 11.
 *
 *   pnpm admin:create <email> <name> [role]
 *
 * Password is read from ADMIN_PASSWORD so it never lands in shell history.
 */
import { eq } from "drizzle-orm";
import { db, sql } from "../src/db/client";
import { users } from "../src/db/schema";
import { writeAudit } from "../src/lib/audit";
import { hashPassword } from "../src/lib/auth/password";
import { createUserSchema } from "../src/lib/validation/user";

async function main() {
  const [email, name, role = "owner"] = process.argv.slice(2);
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !name || !password) {
    console.error("usage: ADMIN_PASSWORD=... pnpm admin:create <email> <name> [owner|editor]");
    process.exit(2);
  }

  const parsed = createUserSchema.safeParse({ email, name, password, role });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  const passwordHash = await hashPassword(parsed.data.password);

  if (existing.length > 0 && existing[0]) {
    // Re-running resets the password and clears any lockout, which is what the
    // runbook's "I am locked out" path needs.
    const id = existing[0].id;
    await db.transaction(async (tx) => {
      const [before] = await tx.select().from(users).where(eq(users.id, id)).limit(1);
      await tx
        .update(users)
        .set({
          passwordHash,
          name: parsed.data.name,
          role: parsed.data.role,
          isActive: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
          sessionVersion: (before?.sessionVersion ?? 1) + 1,
        })
        .where(eq(users.id, id));
      await writeAudit(tx, {
        userId: null,
        entity: "users",
        entityId: id,
        action: "update",
        diff: { source: "scripts/create-admin.ts", email: parsed.data.email },
      });
    });
    console.warn(`updated existing admin ${parsed.data.email} (password reset, sessions revoked)`);
  } else {
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email: parsed.data.email,
          name: parsed.data.name,
          role: parsed.data.role,
          passwordHash,
        })
        .returning({ id: users.id });
      if (!created) throw new Error("insert returned no row");
      await writeAudit(tx, {
        userId: null,
        entity: "users",
        entityId: created.id,
        action: "create",
        diff: { source: "scripts/create-admin.ts", email: parsed.data.email },
      });
    });
    console.warn(`created admin ${parsed.data.email} (${parsed.data.role})`);
  }
}

main()
  .then(async () => {
    await sql.end();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await sql.end();
    process.exit(1);
  });
