import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { auth } from ".";
import { LOGIN_PATH } from "./config";

export type AdminUser = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: "owner" | "editor";
};

/**
 * The authoritative session check. The middleware only proves a cookie parses;
 * this proves the account still exists, is active, and has not been revoked
 * since the token was minted.
 *
 * Every admin page and every server action calls this. Skipping it would leave
 * a deactivated admin working normally until their token expired.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      sessionVersion: users.sessionVersion,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) return null;
  if (!user.isActive) return null;
  // Token minted before the last revocation.
  if (user.sessionVersion !== session.user.sessionVersion) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect(LOGIN_PATH);
  return user;
}

/** User management is owner-only; §6 gives editors content rights, not accounts. */
export async function requireOwner(): Promise<AdminUser> {
  const user = await requireAdmin();
  if (user.role !== "owner") redirect("/admin?denied=owner");
  return user;
}

export class NotAuthorizedError extends Error {
  constructor(message = "ไม่มีสิทธิ์ดำเนินการนี้") {
    super(message);
    this.name = "NotAuthorizedError";
  }
}

/** Server-action variant: throws instead of redirecting, so the action can report inline. */
export async function requireOwnerAction(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) throw new NotAuthorizedError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
  if (user.role !== "owner") throw new NotAuthorizedError();
  return user;
}
