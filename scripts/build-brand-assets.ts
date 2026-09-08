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
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { AVIF_EFFORT, QUALITY } from "../src/lib/media/constants";

const MASTER = path.join(process.cwd(), "public/brand/cida-logo.png");
const OUT_DIR = path.join(process.cwd(), "public/brand");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const FONT_DIR = path.join(process.cwd(), "assets/fonts");

/** docs/DESIGN.md's icon table. */
const ICON_SIZES = [180, 192, 512] as const;
const FAVICON_SIZES = [16, 32, 48] as const;
/** Android adaptive icons crop to a circle; 20% padding keeps the mark inside it. */
const MASKABLE_SAFE_RATIO = 0.6;

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

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

  await buildIcons(trimmed);
  await buildOgImage(trimmed, "ทัณฑสถานบำบัดพิเศษกลาง", "กรมราชทัณฑ์ กระทรวงยุติธรรม");
}

/**
 * A multi-image ICO, written by hand. sharp cannot emit `.ico`, and the format
 * is a 6-byte header plus a 16-byte directory entry per image plus the PNGs
 * themselves — cheaper than another dependency on a project that pins every
 * version.
 */
function buildIco(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries: Buffer[] = [];

  for (const image of images) {
    const entry = Buffer.alloc(16);
    // 0 means 256 in this field; every size here is smaller, so a plain write is fine.
    entry.writeUInt8(image.size, 0);
    entry.writeUInt8(image.size, 1);
    entry.writeUInt8(0, 2); // palette size: 0 for a PNG payload
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += image.png.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

async function buildIcons(trimmed: Buffer): Promise<void> {
  // Icons sit on the site background rather than on transparency: a transparent
  // favicon disappears into a dark browser chrome, and iOS composites
  // apple-touch-icon onto black.
  const onWhite = { r: 255, g: 255, b: 255, alpha: 1 };

  const favicons = await Promise.all(
    FAVICON_SIZES.map(async (size) => ({
      size,
      png: await sharp(trimmed)
        .resize(size, size, { fit: "contain", background: onWhite })
        .flatten({ background: onWhite })
        .png({ compressionLevel: 9 })
        .toBuffer(),
    })),
  );

  const ico = buildIco(favicons);
  // At the root, because that is where a browser asks for it unprompted.
  await writeFile(path.join(PUBLIC_DIR, "favicon.ico"), ico);
  console.log(`favicon.ico: ${ico.length} B (${FAVICON_SIZES.join("/")})`);

  for (const size of ICON_SIZES) {
    const png = await sharp(trimmed)
      .resize(size, size, { fit: "contain", background: onWhite })
      .flatten({ background: onWhite })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const name = size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;
    await writeFile(path.join(OUT_DIR, name), png);
    console.log(`${name}: ${png.length} B`);
  }

  // Maskable: the mark shrunk into the safe area so Android's circular crop
  // cannot cut it, on an opaque field so the crop has something to cut.
  const inner = Math.round(512 * MASKABLE_SAFE_RATIO);
  const maskable = await sharp({
    create: { width: 512, height: 512, channels: 4, background: onWhite },
  })
    .composite([
      {
        input: await sharp(trimmed).resize(inner, inner, { fit: "contain" }).png().toBuffer(),
        gravity: "centre",
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(path.join(OUT_DIR, "icon-maskable-512.png"), maskable);
  console.log(`icon-maskable-512.png: ${maskable.length} B`);
}

/**
 * The social and LINE link preview. docs/DESIGN.md: "seed plus the institution
 * name; the seal alone is unreadable in a chat thumbnail" — and the LINE preview
 * matters more than usual here, because a forwarded OA link is the site's main
 * distribution path.
 *
 * The name is typeset in Anuphan so the preview matches the site. librsvg
 * resolves fonts through fontconfig, which cannot read woff2, so the script
 * points fontconfig at the TrueType copies in `assets/fonts` — see the README
 * there. Without that the text would silently fall back to whatever Thai face
 * the machine happens to carry, and the image would differ per developer.
 */
async function buildOgImage(
  trimmed: Buffer,
  siteName: string,
  organisation: string,
): Promise<void> {
  const configDir = await mkdtemp(path.join(tmpdir(), "cida-fonts-"));
  const configPath = path.join(configDir, "fonts.conf");
  await writeFile(
    configPath,
    `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig>` +
      `<dir>${FONT_DIR}</dir><cachedir>${configDir}/cache</cachedir></fontconfig>`,
  );
  process.env.FONTCONFIG_FILE = configPath;

  const sealSize = 260;
  const sealLeft = 96;
  const textLeft = sealLeft + sealSize + 64;
  const textWidth = OG_WIDTH - textLeft - 72;

  const seal = await sharp(trimmed).resize(sealSize, sealSize, { fit: "contain" }).png().toBuffer();

  /**
   * Measure, do not guess. The institution's name is long and comes from a
   * constant that may change; at a fixed size it ran off the canvas and the
   * last glyphs were simply cut, which is the one thing a link preview must not
   * do. Rendering the string alone and trimming to its ink gives its true width,
   * so the size can be scaled to fit the column.
   */
  const fitSize = async (label: string, preferred: number, weight: number): Promise<number> => {
    const probe = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH * 2}" height="200">` +
        `<text x="10" y="140" font-family="Anuphan" font-size="${preferred}" ` +
        `font-weight="${weight}" fill="#000000">${label}</text></svg>`,
    );
    const { info } = await sharp(probe).trim().toBuffer({ resolveWithObject: true });
    if (info.width <= textWidth) return preferred;
    return Math.floor(preferred * (textWidth / info.width));
  };

  const nameSize = await fitSize(siteName, 58, 600);
  const orgSize = await fitSize(organisation, 32, 400);

  // Colours come from the DESIGN.md tokens rather than the live theme: this is a
  // build artefact, and an operator retuning the site must not silently change
  // the image every already-shared link points at.
  const text = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">` +
      `<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="#ffffff"/>` +
      `<rect x="0" y="${OG_HEIGHT - 16}" width="${OG_WIDTH}" height="16" fill="#880924"/>` +
      `<text x="${textLeft}" y="308" font-family="Anuphan" font-size="${nameSize}" font-weight="600" fill="#241c1e">${siteName}</text>` +
      `<text x="${textLeft}" y="${308 + Math.round(nameSize * 0.95)}" font-family="Anuphan" font-size="${orgSize}" fill="#574e50">${organisation}</text>` +
      `</svg>`,
  );

  console.log(`  og text fitted: name ${nameSize}px, organisation ${orgSize}px`);

  const og = await sharp(text)
    .composite([{ input: seal, top: Math.round((OG_HEIGHT - sealSize) / 2), left: sealLeft }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(path.join(OUT_DIR, "og-default.png"), og);
  await rm(configDir, { recursive: true, force: true });
  console.log(`og-default.png: ${og.length} B (${OG_WIDTH}x${OG_HEIGHT})`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
