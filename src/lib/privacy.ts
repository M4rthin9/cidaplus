import "server-only";

import { createHmac } from "node:crypto";
import { assertEnv } from "@/lib/env";

/**
 * Peppered one-way hash for values we must be able to compare but must not
 * store: a visitor's IP on the contact form, their user-agent on a LINE click.
 *
 * SPEC.md §10 is explicit that neither is stored raw. `AUTH_SECRET` is the
 * pepper — it already exists and is already secret, and rotating it invalidates
 * every hash, which for abuse- and dedupe-tracking values is the right
 * behaviour rather than a loss.
 */
export function pepperedHash(value: string): string {
  return createHmac("sha256", assertEnv().AUTH_SECRET).update(value).digest("hex").slice(0, 64);
}
