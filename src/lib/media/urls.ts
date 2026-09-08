import { DERIVATIVE_FORMATS, FORMAT_EXTENSION, type DerivativeFormat } from "./constants";

/**
 * Pure URL and framing helpers. No Node built-ins — this module is imported by
 * client components, so anything touching `node:path` or `node:crypto` belongs
 * in `./storage.ts` instead.
 */

export function derivativeName(width: number, format: DerivativeFormat): string {
  return `${width}.${FORMAT_EXTENSION[format]}`;
}

/** Served at /media/* so §11's Cloudflare cache rule applies (not /api/*, which it bypasses). */
export function mediaUrl(storageKey: string, file: string): string {
  return `/media/${storageKey}/${file}`;
}

export type Rendition = { width: number; format: DerivativeFormat; url: string };

/** `<picture>`-ordered renditions for the widths actually generated. */
export function renditions(storageKey: string, widths: readonly number[]): Rendition[] {
  const out: Rendition[] = [];
  for (const format of DERIVATIVE_FORMATS) {
    for (const width of widths) {
      out.push({ width, format, url: mediaUrl(storageKey, derivativeName(width, format)) });
    }
  }
  return out;
}

/** `object-position` from the stored focal point. */
export function focalPosition(focalX: number, focalY: number): string {
  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
  return `${clamp(focalX)}% ${clamp(focalY)}%`;
}
