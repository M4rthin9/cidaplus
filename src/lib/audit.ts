/**
 * Audit log. CLAUDE.md: "Every mutation writes an `audit_log` row with a
 * field-level diff."
 *
 * The diff builder is pure so the redaction rules are testable — a leaked
 * password hash in an audit row would be worse than no audit row at all.
 */
import type { db as Db } from "@/db/client";
import { auditLog } from "@/db/schema";

/** Never recorded, in either the before or after side of a diff. */
const REDACTED_FIELDS = new Set([
  "passwordHash",
  "password_hash",
  "password",
  "confirmPassword",
  "sessionVersion",
]);

export const REDACTED = "[redacted]" as const;

export type FieldChange = { readonly from: unknown; readonly to: unknown };
export type Diff = Record<string, FieldChange>;

function normalise(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value === undefined ? null : value;
}

/**
 * Field-level diff of two records. Only changed fields appear; a field whose
 * name is redacted appears as a change without its values, so the fact that a
 * password was rotated is auditable while the material never is.
 */
export function diffFields(
  before: Readonly<Record<string, unknown>> | null,
  after: Readonly<Record<string, unknown>> | null,
): Diff {
  const diff: Diff = {};
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);

  for (const key of keys) {
    const from = normalise(before?.[key]);
    const to = normalise(after?.[key]);
    if (JSON.stringify(from) === JSON.stringify(to)) continue;

    diff[key] = REDACTED_FIELDS.has(key) ? { from: REDACTED, to: REDACTED } : { from, to };
  }
  return diff;
}

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "login.success"
  | "login.failure"
  | "login.locked"
  | "logout";

export type AuditEntry = {
  readonly userId: string | null;
  readonly entity: string;
  readonly entityId: string | null;
  readonly action: AuditAction;
  readonly diff?: Diff | Record<string, unknown>;
};

type Executor = typeof Db | Parameters<Parameters<typeof Db.transaction>[0]>[0];

/**
 * Write one audit row. Takes the executor so it can join the caller's
 * transaction — an audit row that survives a rolled-back mutation is a lie.
 */
export async function writeAudit(exec: Executor, entry: AuditEntry): Promise<void> {
  await exec.insert(auditLog).values({
    userId: entry.userId,
    entity: entry.entity,
    entityId: entry.entityId,
    action: entry.action,
    diff: entry.diff ?? null,
  });
}
