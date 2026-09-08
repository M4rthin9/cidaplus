import { derivativeName, focalPosition, mediaUrl } from "@/lib/media/urls";
import { cn } from "@/lib/utils";

export type ThumbMedia = {
  id: string;
  storageKey: string;
  filename: string;
  blurhash: string | null;
  focalX: number;
  focalY: number;
  alt?: string | null;
  /**
   * The source's own width. The pipeline never upscales, so a 420px upload has
   * only the 400px derivative — advertising 800 and 1600 in a `srcSet` makes the
   * browser fetch URLs that 404. Measured: Lighthouse Best Practices dropped to
   * 96 on a product page for exactly that request.
   */
  width?: number | null;
};

/** The widths that actually exist for a source of this size. */
function availableWidths(sourceWidth: number | null | undefined): number[] {
  const widths = [400, 800, 1600];
  if (!sourceWidth) return widths;
  const usable = widths.filter((w) => w <= sourceWidth);
  // A source smaller than the smallest derivative still gets that one written.
  return usable.length > 0 ? usable : [widths[0] as number];
}

/**
 * One image, cropped by the consumer's aspect ratio rather than by the file.
 *
 * The derivative set is stored at the source's natural aspect; `object-fit:
 * cover` plus the stored focal point does the framing, so the same file serves
 * a 3:4 product card and a 16:9 post cover (SPEC.md §14 decision 15).
 */
export function MediaThumb({
  media,
  width = 400,
  aspect = "square",
  className,
  sizes = "(max-width: 640px) 50vw, 200px",
}: {
  media: ThumbMedia;
  width?: 400 | 800 | 1600;
  aspect?: "square" | "product" | "cover";
  className?: string;
  sizes?: string;
}) {
  const ratio = aspect === "product" ? "3 / 4" : aspect === "cover" ? "16 / 9" : "1 / 1";
  const widths = availableWidths(media.width);
  // Never ask for a rendition larger than the largest one written.
  const fallbackWidth = Math.min(width, widths[widths.length - 1] ?? width);

  return (
    <div
      className={cn("overflow-hidden rounded-(--radius-card) bg-(--color-surface-alt)", className)}
      style={{ aspectRatio: ratio }}
    >
      <picture>
        <source
          type="image/avif"
          srcSet={widths
            .map((w) => `${mediaUrl(media.storageKey, derivativeName(w, "avif"))} ${w}w`)
            .join(", ")}
          sizes={sizes}
        />
        <source
          type="image/webp"
          srcSet={widths
            .map((w) => `${mediaUrl(media.storageKey, derivativeName(w, "webp"))} ${w}w`)
            .join(", ")}
          sizes={sizes}
        />
        <img
          src={mediaUrl(
            media.storageKey,
            derivativeName(fallbackWidth as 400 | 800 | 1600, "jpeg"),
          )}
          alt={media.alt ?? ""}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          style={{ objectPosition: focalPosition(media.focalX, media.focalY) }}
        />
      </picture>
    </div>
  );
}

/**
 * The empty state, for a product with no photograph yet. docs/DESIGN.md: a
 * neutral block with a centred mark — never a stretched logo, never a broken
 * image icon. Real photography is arriving later, so this ships visible.
 */
export function MediaPlaceholder({
  aspect = "square",
  className,
  label = "ยังไม่มีรูปภาพ",
}: {
  aspect?: "square" | "product" | "cover";
  className?: string;
  label?: string;
}) {
  const ratio = aspect === "product" ? "3 / 4" : aspect === "cover" ? "16 / 9" : "1 / 1";
  return (
    <div
      className={cn(
        "grid place-content-center rounded-(--radius-card) bg-(--color-surface-alt)",
        className,
      )}
      style={{ aspectRatio: ratio }}
    >
      <span className="text-sm text-(--color-text-muted)">{label}</span>
    </div>
  );
}
