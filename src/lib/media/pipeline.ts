import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type Sharp } from "sharp";
import { encode as encodeBlurhash } from "blurhash";
import {
  AVIF_EFFORT,
  BLURHASH_COMPONENTS_X,
  BLURHASH_COMPONENTS_Y,
  BLURHASH_SAMPLE,
  DEFAULT_ORIGINAL_KEEP_MAX_BYTES,
  DERIVATIVE_FORMATS,
  DERIVATIVE_WIDTHS,
  MASTER_MAX_WIDTH,
  MASTER_QUALITY,
  MAX_UPLOAD_BYTES,
  QUALITY,
  type DerivativeFormat,
} from "./constants";
import { ACCEPTED_MIME, sniffImageFormat, type SniffedFormat } from "./magic";
import { MASTER_NAME, keyDirectory, newStorageKey, originalName } from "./storage";
import { derivativeName } from "./urls";

/**
 * Display-only name. Paths come from the storage key, never from user input,
 * so this is about a readable admin list rather than about safety.
 */
export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "image";
  const cleaned = base.replace(/[\u0000-\u001f<>:"|?*]/g, "").trim();
  return (cleaned.length > 0 ? cleaned : "image").slice(0, 200);
}

export class MediaRejected extends Error {
  constructor(
    message: string,
    readonly code: "too_large" | "unsupported" | "unreadable" | "empty",
  ) {
    super(message);
    this.name = "MediaRejected";
  }
}

export type ProcessedMedia = {
  readonly storageKey: string;
  /** Sanitised display name. Never used to build a path. */
  readonly filename: string;
  readonly mime: string;
  readonly width: number;
  readonly height: number;
  /** Bytes actually written to disk, all renditions summed. */
  readonly bytes: number;
  readonly blurhash: string;
  readonly focalX: number;
  readonly focalY: number;
  readonly originalKept: boolean;
  readonly widths: readonly number[];
};

function originalKeepLimit(): number {
  const raw = process.env.MEDIA_KEEP_ORIGINAL_MAX_BYTES;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ORIGINAL_KEEP_MAX_BYTES;
}

/**
 * Where the subject actually is, so a 3:4 card can crop without decapitating it.
 * sharp reports `attentionX`/`attentionY` in source pixels when the attention
 * strategy runs; the square resize is only a vehicle for asking the question.
 */
async function detectFocalPoint(
  input: Buffer,
  width: number,
  height: number,
): Promise<{ focalX: number; focalY: number }> {
  const side = Math.min(width, height);
  try {
    const { info } = await sharp(input)
      .resize({ width: side, height: side, fit: "cover", position: sharp.strategy.attention })
      .toBuffer({ resolveWithObject: true });

    const ax = (info as { attentionX?: number }).attentionX;
    const ay = (info as { attentionY?: number }).attentionY;
    if (typeof ax !== "number" || typeof ay !== "number") return { focalX: 50, focalY: 50 };

    const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
    return { focalX: clamp((ax / width) * 100), focalY: clamp((ay / height) * 100) };
  } catch {
    // Framing is a nicety; a failure here must not fail the upload.
    return { focalX: 50, focalY: 50 };
  }
}

async function computeBlurhash(input: Buffer): Promise<string> {
  const { data, info } = await sharp(input)
    .resize(BLURHASH_SAMPLE, BLURHASH_SAMPLE, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return encodeBlurhash(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    BLURHASH_COMPONENTS_X,
    BLURHASH_COMPONENTS_Y,
  );
}

function encodeTo(pipe: Sharp, format: DerivativeFormat): Sharp {
  if (format === "avif") return pipe.avif({ quality: QUALITY.avif, effort: AVIF_EFFORT });
  if (format === "webp") return pipe.webp({ quality: QUALITY.webp });
  return pipe.jpeg({ quality: QUALITY.jpeg, progressive: true, mozjpeg: true });
}

/**
 * Validate, normalise and derive one upload.
 *
 * Order matters: size cap, then magic bytes, then sharp. Nothing reaches the
 * decoder until the bytes have been proven to be one of four image formats
 * (SPEC.md §13).
 */
export async function processUpload(
  original: Buffer,
  filename: string,
  options: { now?: Date } = {},
): Promise<ProcessedMedia> {
  if (original.byteLength === 0) {
    throw new MediaRejected("ไฟล์ว่างเปล่า", "empty");
  }
  if (original.byteLength > MAX_UPLOAD_BYTES) {
    throw new MediaRejected(
      `ไฟล์ใหญ่เกินไป ขนาดสูงสุด ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB`,
      "too_large",
    );
  }

  const sniffed: SniffedFormat | null = sniffImageFormat(original);
  if (!sniffed) {
    throw new MediaRejected("รองรับเฉพาะไฟล์ JPEG, PNG, WebP และ AVIF เท่านั้น", "unsupported");
  }

  /**
   * `.rotate()` with no argument applies the EXIF orientation and then drops the
   * tag. Combined with sharp's default of not copying metadata, this both fixes
   * sideways phone photos and strips EXIF — including GPS (§13).
   */
  const meta = await sharp(original, { failOn: "error" })
    .metadata()
    .catch(() => null);
  if (!meta?.width || !meta.height) {
    throw new MediaRejected("ไม่สามารถอ่านไฟล์ภาพนี้ได้", "unreadable");
  }

  const width = meta.autoOrient?.width ?? meta.width;
  const height = meta.autoOrient?.height ?? meta.height;

  const storageKey = newStorageKey(options.now);
  const dir = keyDirectory(storageKey);
  await mkdir(dir, { recursive: true });

  let bytes = 0;
  const write = async (name: string, data: Buffer) => {
    await writeFile(path.join(dir, name), data);
    bytes += data.byteLength;
  };

  /**
   * Decode the source exactly once, into a capped master. Everything else —
   * every derivative, the blurhash, the focal point — is derived from that.
   *
   * The obvious alternative, holding a full-size uncompressed intermediate, cost
   * 21s and roughly 100 MB of buffer on a 5906x5906 source. On a 4-core VPS
   * that is a server action timing out, so the master is the working copy.
   * MASTER_MAX_WIDTH is >= the largest derivative width, so nothing is upscaled
   * and no quality is lost versus deriving from the source.
   */
  const master = await sharp(original, { failOn: "error" })
    .rotate()
    .resize({ width: MASTER_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: MASTER_QUALITY })
    .toBuffer();
  await write(MASTER_NAME, master);

  // Never upscale: a 300px source gets one 300px rendition, not a blurry 1600.
  const widths = DERIVATIVE_WIDTHS.filter((w) => w <= width);
  if (widths.length === 0) widths.push(width as (typeof DERIVATIVE_WIDTHS)[number]);

  for (const w of widths) {
    for (const format of DERIVATIVE_FORMATS) {
      const buf = await encodeTo(
        sharp(master).resize({ width: w, withoutEnlargement: true }),
        format,
      ).toBuffer();
      await write(derivativeName(w, format), buf);
    }
  }

  const originalKept = original.byteLength <= originalKeepLimit();
  if (originalKept) {
    const ext = sniffed === "jpeg" ? "jpg" : sniffed;
    await write(originalName(ext), original);
  }

  // Focal point is expressed as a percentage, so measuring it on the master
  // gives the same answer as measuring it on the source.
  const masterMeta = await sharp(master).metadata();
  const [blurhash, focal] = await Promise.all([
    computeBlurhash(master),
    detectFocalPoint(master, masterMeta.width ?? width, masterMeta.height ?? height),
  ]);

  return {
    storageKey,
    filename: safeFilename(filename),
    mime: ACCEPTED_MIME[sniffed],
    width,
    height,
    bytes,
    blurhash,
    focalX: focal.focalX,
    focalY: focal.focalY,
    originalKept,
    widths,
  };
}

/** Human-readable size for the Thai admin UI. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
