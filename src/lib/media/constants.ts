/** Media pipeline configuration. SPEC.md §2, §9, §13. */

/** §13: cap at 10 MB. Enforced before sharp ever touches the buffer. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Must stay below `serverActions.bodySizeLimit` in next.config.ts. Next buffers
 * the entire Server Action body and rejects it above the limit before our code
 * runs, so an oversized batch has to be refused in the browser or it fails with
 * no message at all.
 */
export const MAX_BATCH_BYTES = 22 * 1024 * 1024;

/** §9: 400 / 800 / 1600px. Never upscaled past the source width. */
export const DERIVATIVE_WIDTHS = [400, 800, 1600] as const;

/** §9: AVIF + WebP + JPEG fallback, in the order a <picture> should offer them. */
export const DERIVATIVE_FORMATS = ["avif", "webp", "jpeg"] as const;
export type DerivativeFormat = (typeof DERIVATIVE_FORMATS)[number];

export const FORMAT_EXTENSION: Record<DerivativeFormat, string> = {
  avif: "avif",
  webp: "webp",
  jpeg: "jpg",
};

export const FORMAT_MIME: Record<DerivativeFormat, string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpeg: "image/jpeg",
};

/**
 * A capped re-derivation source, always written. The true original may be
 * dropped on a 60 GB disk, but throwing away every large source would make a
 * future size or format impossible to add — this is the compromise.
 */
export const MASTER_MAX_WIDTH = 2400;
export const MASTER_QUALITY = 82;

/**
 * §2: "delete originals over a configurable threshold". Overridable with
 * MEDIA_KEEP_ORIGINAL_MAX_BYTES; phase 6 can move it into settings.
 */
export const DEFAULT_ORIGINAL_KEEP_MAX_BYTES = 2 * 1024 * 1024;

export const QUALITY: Record<DerivativeFormat, number> = {
  avif: 50, // AVIF holds up far lower than JPEG at the same perceived quality
  webp: 78,
  jpeg: 80,
};

/**
 * AVIF encoder effort, and the single most expensive number in this file.
 * Measured on this box, encoding one 1600px rendition:
 *
 *   effort 4 -> 10 978 ms, 117 KB
 *   effort 2 ->  1 689 ms, 125 KB   <- chosen
 *   effort 0 ->    369 ms, 200 KB
 *
 * Effort 4 costs 6.5x the time for 7% smaller files, and the upload happens in a
 * Server Action on a 4-core VPS shared with Postgres. Effort 0 gives that time
 * back but inflates every AVIF by 60%, which is the format's whole point.
 */
export const AVIF_EFFORT = 2;

/** Blurhash is decoded into a tiny placeholder, so the source can be tiny too. */
export const BLURHASH_SAMPLE = 32;
export const BLURHASH_COMPONENTS_X = 4;
export const BLURHASH_COMPONENTS_Y = 3;

/** Aspect ratios the storefront crops to via object-fit (docs/DESIGN.md). */
export const ASPECT = { product: 3 / 4, postCover: 16 / 9 } as const;
