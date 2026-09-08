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
};

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

  return (
    <div
      className={cn("overflow-hidden rounded-(--radius-card) bg-(--color-surface-alt)", className)}
      style={{ aspectRatio: ratio }}
    >
      <picture>
        <source
          type="image/avif"
          srcSet={[400, 800, 1600]
            .map((w) => `${mediaUrl(media.storageKey, derivativeName(w, "avif"))} ${w}w`)
            .join(", ")}
          sizes={sizes}
        />
        <source
          type="image/webp"
          srcSet={[400, 800, 1600]
            .map((w) => `${mediaUrl(media.storageKey, derivativeName(w, "webp"))} ${w}w`)
            .join(", ")}
          sizes={sizes}
        />
        <img
          src={mediaUrl(media.storageKey, derivativeName(width, "jpeg"))}
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
