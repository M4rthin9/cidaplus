import "server-only";

import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

/**
 * Filesystem layout. Server-only: importing this from a client component is a
 * build error by design, because it pulls node:path and node:crypto.
 * URL and framing helpers live in `./urls.ts`.
 *
 * A storage key is a directory, not a file: `2026/09/<uuid>`. Every rendition of
 * one upload lives inside it, so deleting an image is removing one folder and a
 * partial cleanup cannot orphan half a set.
 */

export function mediaRoot(): string {
  const dir = process.env.MEDIA_DIR;
  if (!dir) throw new Error("MEDIA_DIR is not set");
  return path.resolve(dir);
}

/** Date-sharded so no directory grows without bound. */
export function newStorageKey(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}/${month}/${randomUUID()}`;
}

export const MASTER_NAME = "master.webp";
export const originalName = (extension: string) => `original.${extension}`;

export function keyDirectory(storageKey: string): string {
  return path.join(mediaRoot(), storageKey);
}

/**
 * Resolve a request path to a file, refusing anything that escapes MEDIA_DIR.
 * `path.resolve` collapses `..` before the check, so an encoded traversal is
 * already normalised by the time prefixes are compared.
 */
export function resolveMediaPath(segments: readonly string[]): string | null {
  if (segments.length === 0) return null;
  if (segments.some((s) => s.length === 0 || s === "." || s === "..")) return null;

  const root = mediaRoot();
  const candidate = path.resolve(root, ...segments);

  // The separator guard stops `/data/media-secrets` matching `/data/media`.
  if (candidate !== root && !candidate.startsWith(root + path.sep)) return null;
  return candidate;
}

/** Immutable: the key contains a uuid, so a given URL's bytes never change. */
export function cacheHeaders(etagSource: string): Record<string, string> {
  return {
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: `"${createHash("sha1").update(etagSource).digest("hex").slice(0, 16)}"`,
  };
}
