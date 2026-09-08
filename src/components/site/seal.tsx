/**
 * The institutional seal, at header and hero sizes.
 *
 * docs/DESIGN.md: the mark is a เครื่องหมายราชการ and is reproduced exactly —
 * never recolored, never redrawn, never on a tinted panel, never cropped, never
 * stretched. So it is a fixed-aspect image with no filter and no background,
 * sized by the caller. `scripts/build-brand-assets.ts` produces the files.
 *
 * `priority` is for the homepage hero, which is the measured LCP element: it
 * drops the lazy load and asks the browser to fetch the image ahead of the rest
 * of the page.
 */
const RENDITIONS = {
  header: { base: 112, retina: 168 },
  hero: { base: 280, retina: 420 },
} as const;

export function Seal({
  size = 56,
  priority = false,
  className,
}: {
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  // One source set per role rather than per pixel size: two files cover 1x-3x
  // at either scale, and a third would only add bytes nobody sees.
  const { base, retina } = size > 96 ? RENDITIONS.hero : RENDITIONS.header;

  return (
    <>
      {/*
       * The hero seal is the homepage's LCP element, and it was being discovered
       * only after the CSS and HTML had parsed — measured as 819ms of load delay
       * on top of a 194ms download. React 19 hoists this <link> into <head>, so
       * the fetch starts with the document rather than after it. AVIF only: the
       * browser ignores a preload whose `type` it cannot decode, and every
       * browser that misses AVIF falls through to the <source> chain below.
       */}
      {priority && (
        <link
          rel="preload"
          as="image"
          type="image/avif"
          href={`/brand/seal-${base}.avif`}
          imageSrcSet={`/brand/seal-${base}.avif 1x, /brand/seal-${retina}.avif 2x`}
          fetchPriority="high"
        />
      )}
      <picture>
        <source
          type="image/avif"
          srcSet={`/brand/seal-${base}.avif 1x, /brand/seal-${retina}.avif 2x`}
        />
        <source
          type="image/webp"
          srcSet={`/brand/seal-${base}.webp 1x, /brand/seal-${retina}.webp 2x`}
        />
        <img
          src={`/brand/seal-${base}.png`}
          srcSet={`/brand/seal-${base}.png 1x, /brand/seal-${retina}.png 2x`}
          width={size}
          height={size}
          alt=""
          aria-hidden="true"
          decoding={priority ? "sync" : "async"}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          className={className}
          style={{ width: size, height: size }}
        />
      </picture>
    </>
  );
}
