import { hash, verify, type Algorithm } from "@node-rs/argon2";

/**
 * Argon2id (SPEC.md §3). Parameters follow the OWASP Password Storage
 * Cheat Sheet's argon2id baseline: 19 MiB, 2 iterations, 1 lane.
 *
 * memoryCost is deliberately modest — the VPS has 6 GB shared with Postgres
 * (SPEC.md §2), and a login storm must not be the thing that OOMs the box.
 */
/**
 * `Algorithm.Argon2id`. The enum is declared `const`, which `isolatedModules`
 * forbids importing as a value, so the numeric member is spelled out and
 * checked against the type. Asserted by a test on the digest prefix.
 */
const ARGON2ID = 2 as Algorithm;

const OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(digest: string, plain: string): Promise<boolean> {
  try {
    return await verify(digest, plain, OPTIONS);
  } catch {
    // A malformed or truncated digest is a failed login, not a crash.
    return false;
  }
}

/**
 * A real argon2id digest of a value nobody can supply, used to burn the same
 * CPU when the email does not exist. Without it, "unknown email" returns in
 * microseconds while "wrong password" takes ~50ms, and the difference
 * enumerates accounts.
 */
let decoyDigest: string | undefined;

export async function burnTimingBudget(): Promise<void> {
  decoyDigest ??= await hashPassword(`decoy:${crypto.randomUUID()}`);
  await verifyPassword(decoyDigest, "not-the-password");
}
