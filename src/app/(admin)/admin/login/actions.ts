"use server";

import { AuthError } from "next-auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { signIn } from "@/lib/auth";
import { ADMIN_HOME } from "@/lib/auth/config";
import { isLocked, minutesRemaining } from "@/lib/auth/lockout";
import { loginRateLimit } from "@/lib/rate-limit";
import { fieldErrors, loginSchema } from "@/lib/validation/user";

export type LoginState = {
  readonly errors?: Record<string, string>;
  readonly message?: string;
};

/** Best-effort client identity for rate limiting. Behind Cloudflare, Caddy restores the real IP. */
async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  // Throttles a burst from one source. The per-account lockout is separate and
  // persisted, so restarting the container does not clear it (SPEC.md §13).
  const limit = loginRateLimit.check(await clientKey());
  if (!limit.allowed) {
    return {
      message: `พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารออีก ${limit.retryAfterSeconds} วินาที`,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: ADMIN_HOME,
    });
    return {};
  } catch (error) {
    // signIn throws a redirect on success; Next needs it to propagate.
    if (!(error instanceof AuthError)) throw error;

    // authorize() returns null for every failure so the error itself is
    // uniform. Read the account state to decide which message is honest.
    const [user] = await db
      .select({
        failedLoginAttempts: users.failedLoginAttempts,
        lockedUntil: users.lockedUntil,
      })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);

    if (user && isLocked(user)) {
      return {
        message:
          `บัญชีถูกระงับชั่วคราวเนื่องจากกรอกรหัสผ่านผิดหลายครั้ง ` +
          `กรุณารออีก ${minutesRemaining(user)} นาที แล้วลองใหม่อีกครั้ง`,
      };
    }

    return { message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }
}
