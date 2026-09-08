/**
 * Header derivatives of the institutional seal. docs/DESIGN.md: "script this,
 * don't hand-export".
 *
 * The master is 5906x5906 and 7.5 MB — not something to serve. The header
 * renders a lockup: the mark at a legible size beside the institution name set
 * as live text, so only the mark is an image and only at header sizes.
 *
 * The trim removes the 0.6% transparent margin measured in DESIGN.md, so the
 * header controls its own spacing rather than inheriting the file's.
 *
 * Not generated here: the favicon, the maskable icon and the OG image. DESIGN.md
 * requires a *simplified* mark drawn on purpose for the small sizes — the two
 * rings of Thai microtext turn to noise below ~96px and to a maroon dot at 16px
 * — and downscaling the seal into a favicon is exactly the treatment the file
 * forbids. Those wait on the SVG master (§14 still-open 1) and phase 10.
 *
 *   pnpm tsx scripts/build-brand-assets.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AVIF_EFFORT, QUALITY } from "../src/lib/media/constants";

const MASTER = path.join(process.cwd(), "public/brand/cida-logo.png");
const OUT_DIR = path.join(process.cwd(), "public/brand");

/**
 * The header renders the mark at 56px and the homepage hero at 140px. Each gets
 * 2x and 3x, because the hero seal is the largest-contentful-paint element on
 * the homepage and serving it upscaled is both blurry and a measured LCP cost.
 */
const SIZES = [112, 168, 280, 420] as const;

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const trimmed = await sharp(MASTER).trim().toBuffer();
  const meta = await sharp(trimmed).metadata();
  console.log(`trimmed master: ${meta.width}x${meta.height}`);

  for (const size of SIZES) {
    const png = await sharp(trimmed)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    await writeFile(path.join(OUT_DIR, `seal-${size}.png`), png);

    /**
     * The hero seal is the homepage's largest-contentful-paint element, so its
     * bytes are an LCP number, not a storage number. The mark is flat artwork
     * with hard edges, which holds up far below photographic quality — and AVIF
     * is offered first because it roughly halves the WebP size here.
     */
    const webp = await sharp(trimmed)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 78 })
      .toBuffer();
    await writeFile(path.join(OUT_DIR, `seal-${size}.webp`), webp);

    const avif = await sharp(trimmed)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .avif({ quality: QUALITY.avif, effort: AVIF_EFFORT })
      .toBuffer();
    await writeFile(path.join(OUT_DIR, `seal-${size}.avif`), avif);

    console.log(`seal-${size}: png ${png.length} B, webp ${webp.length} B, avif ${avif.length} B`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
