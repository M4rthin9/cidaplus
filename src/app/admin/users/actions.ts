"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql as raw } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { diffFields, writeAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import { NotAuthorizedError, requireOwnerAction } from "@/lib/auth/session";
import { createUserSchema, fieldErrors, updateUserSchema } from "@/lib/validation/user";

export type UserFormState = {
  readonly errors?: Record<string, string>;
  readonly message?: string;
};

/** Columns safe to audit. `passwordHash` is redacted by diffFields regardless. */
const AUDITED = ["email", "name", "role", "isActive"] as const;

function auditable(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(AUDITED.map((k) => [k, row[k]]));
}

export async function createUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  let actor;
  try {
    actor = await requireOwnerAction();
  } catch (error) {
    if (error instanceof NotAuthorizedError) return { message: error.message };
    throw error;
  }

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (existing.length > 0) {
    return { errors: { email: "อีเมลนี้ถูกใช้งานแล้ว" } };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        passwordHash,
      })
      .returning();
    if (!created) throw new Error("insert returned no row");

    // Audit joins the same transaction — a row that survives a rollback is a lie.
    await writeAudit(tx, {
      userId: actor.id,
      entity: "users",
      entityId: created.id,
      action: "create",
      diff: diffFields(null, { ...auditable(created), passwordHash }),
    });
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?created=1");
}

export async function updateUserAction(
  userId: string,
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  let actor;
  try {
    actor = await requireOwnerAction();
  } catch (error) {
    if (error instanceof NotAuthorizedError) return { message: error.message };
    throw error;
  }

  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "on",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const [before] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!before) return { message: "ไม่พบผู้ใช้รายนี้" };

  // An owner must not be able to strip their own access and strand the site.
  if (before.id === actor.id && (parsed.data.role !== "owner" || !parsed.data.isActive)) {
    return { message: "ไม่สามารถลดสิทธิ์หรือปิดใช้งานบัญชีของตนเองได้" };
  }
  if (before.role === "owner" && parsed.data.role !== "owner") {
    const [owners] = await db
      .select({ count: raw<number>`count(*)::int` })
      .from(users)
      .where(raw`role = 'owner' and is_active = true`);
    if ((owners?.count ?? 0) <= 1) {
      return { message: "ต้องมีผู้ดูแลสูงสุดที่ใช้งานอยู่อย่างน้อยหนึ่งบัญชี" };
    }
  }

  const changingPassword = Boolean(parsed.data.password);
  const deactivating = before.isActive && !parsed.data.isActive;

  await db.transaction(async (tx) => {
    const patch: Record<string, unknown> = {
      name: parsed.data.name,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    };

    if (changingPassword) {
      patch.passwordHash = await hashPassword(parsed.data.password as string);
    }
    // Revoke live sessions when access changes. This is what recovers the
    // capability database sessions would have given us (SPEC.md §14 dec. 13).
    if (changingPassword || deactivating || before.role !== parsed.data.role) {
      patch.sessionVersion = before.sessionVersion + 1;
      patch.failedLoginAttempts = 0;
      patch.lockedUntil = null;
    }

    const [after] = await tx.update(users).set(patch).where(eq(users.id, userId)).returning();
    if (!after) throw new Error("update returned no row");

    await writeAudit(tx, {
      userId: actor.id,
      entity: "users",
      entityId: userId,
      action: "update",
      diff: diffFields(
        { ...auditable(before), passwordHash: before.passwordHash },
        { ...auditable(after), passwordHash: after.passwordHash },
      ),
    });
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?updated=1");
}

/** Users are never deleted — there is no `deleted_at` on the table (SPEC.md §6). */
export async function setUserActiveAction(userId: string, isActive: boolean): Promise<void> {
  const actor = await requireOwnerAction();
  if (actor.id === userId && !isActive) {
    throw new NotAuthorizedError("ไม่สามารถปิดใช้งานบัญชีของตนเองได้");
  }

  const [before] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!before) throw new Error("ไม่พบผู้ใช้รายนี้");

  await db.transaction(async (tx) => {
    const [after] = await tx
      .update(users)
      .set({
        isActive,
        sessionVersion: isActive ? before.sessionVersion : before.sessionVersion + 1,
        failedLoginAttempts: 0,
        lockedUntil: null,
      })
      .where(eq(users.id, userId))
      .returning();
    if (!after) throw new Error("update returned no row");

    await writeAudit(tx, {
      userId: actor.id,
      entity: "users",
      entityId: userId,
      action: isActive ? "restore" : "delete",
      diff: diffFields(auditable(before), auditable(after)),
    });
  });

  revalidatePath("/admin/users");
}
