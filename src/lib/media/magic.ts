/**
 * Format sniffing by magic bytes. SPEC.md §13: "validate magic bytes, not just
 * the extension."
 *
 * A `.jpg` that is actually an SVG or an HTML document is the classic stored-XSS
 * route through an image uploader, and the extension is attacker-controlled.
 */

export type SniffedFormat = "jpeg" | "png" | "webp" | "avif";

export const ACCEPTED_MIME: Record<SniffedFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

/** Browser `accept` attribute for the upload input — convenience, never trusted. */
export const ACCEPT_ATTRIBUTE = "image/jpeg,image/png,image/webp,image/avif";

function startsWith(buf: Uint8Array, bytes: readonly number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buf[offset + i] === b);
}

function ascii(buf: Uint8Array, start: number, end: number): string {
  if (buf.length < end) return "";
  return String.fromCharCode(...buf.subarray(start, end));
}

/** ISO-BMFF brands that mean "this is an AVIF still or sequence". */
const AVIF_BRANDS = new Set(["avif", "avis"]);

/**
 * Returns the real format, or null if the bytes are not one of the four image
 * types we accept. Never infers from the filename.
 */
export function sniffImageFormat(buf: Uint8Array): SniffedFormat | null {
  // JPEG: FF D8 FF
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return "jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";

  // WebP: "RIFF" ???? "WEBP"
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 12) === "WEBP") return "webp";

  // AVIF: ISO-BMFF, "ftyp" at offset 4, brand at 8. Also scan the compatible
  // brand list, since some encoders put a generic brand first.
  if (ascii(buf, 4, 8) === "ftyp") {
    if (AVIF_BRANDS.has(ascii(buf, 8, 12))) return "avif";
    const boxSize = Math.min(buf.length, 64);
    for (let i = 16; i + 4 <= boxSize; i += 4) {
      if (AVIF_BRANDS.has(ascii(buf, i, i + 4))) return "avif";
    }
  }

  return null;
}
