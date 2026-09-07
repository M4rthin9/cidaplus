import { z } from "zod";

/**
 * Environment contract. SPEC.md §11.
 *
 * Two rules drive the shape of this file:
 *
 *  - Fail fast at boot. `assertEnv()` runs from `instrumentation.ts`, so a missing
 *    or malformed variable stops the server with a readable list instead of
 *    surfacing as a null-pointer somewhere in a request handler.
 *  - SMTP is optional on purpose. It is not provisioned yet, and the contact form
 *    must still accept and persist an enquiry without it (SPEC.md §9). Anything
 *    that would make the app refuse to boot without SMTP is a bug.
 */

const optionalNonEmpty = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // --- required ---------------------------------------------------------
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z
    .string()
    .trim()
    .min(
      32,
      "AUTH_SECRET must be at least 32 characters — generate with `openssl rand -base64 32`",
    ),
  AUTH_URL: z.url("AUTH_URL must be an absolute URL"),
  NEXT_PUBLIC_SITE_URL: z.url("NEXT_PUBLIC_SITE_URL must be an absolute URL"),
  MEDIA_DIR: z.string().trim().min(1, "MEDIA_DIR is required"),

  /**
   * Bootstrap value only. Once `settings.line` carries a row, the database wins —
   * the URL must appear nowhere else in the codebase (SPEC.md §8, CLAUDE.md).
   */
  LINE_OA_URL: z.url("LINE_OA_URL must be an absolute URL"),

  // --- optional ---------------------------------------------------------
  // Unset is the expected state today. Do not promote these to required.
  SMTP_HOST: optionalNonEmpty,
  SMTP_PORT: z.coerce.number().int().positive().max(65535).optional(),
  SMTP_USER: optionalNonEmpty,
  SMTP_PASSWORD: optionalNonEmpty,
  SMTP_FROM: z.email("SMTP_FROM must be an email address").optional(),

  // Only needed for Caddy's DNS-01 challenge. Unused with a Cloudflare Origin
  // Certificate — see SPEC.md §11.
  CLOUDFLARE_API_TOKEN: optionalNonEmpty,
});

export type Env = z.infer<typeof envSchema>;

export type ParseEnvResult =
  | { readonly ok: true; readonly env: Env }
  | { readonly ok: false; readonly issues: readonly string[] };

/** Pure parse — no side effects, no process access. Exported so tests can drive it. */
export function parseEnv(source: Record<string, string | undefined>): ParseEnvResult {
  const result = envSchema.safeParse(source);
  if (result.success) return { ok: true, env: result.data };

  const issues = result.error.issues.map((issue) => {
    const path = issue.path.join(".") || "(root)";
    return `${path}: ${issue.message}`;
  });
  return { ok: false, issues };
}

/** True when SMTP is configured well enough to attempt a send. */
export function hasSmtp(env: Env): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM);
}

let cached: Env | undefined;

export function assertEnv(source: Record<string, string | undefined> = process.env): Env {
  if (cached) return cached;

  const result = parseEnv(source);
  if (!result.ok) {
    const lines = result.issues.map((i) => `  - ${i}`).join("\n");
    throw new Error(
      `Invalid environment. ${result.issues.length} problem(s) found:\n${lines}\n\n` +
        `See .env.example for the full contract (SPEC.md §11).`,
    );
  }

  cached = result.env;
  return cached;
}

/** Reset the memo. Tests only. */
export function resetEnvCache(): void {
  cached = undefined;
}
