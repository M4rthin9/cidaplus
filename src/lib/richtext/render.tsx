import { Fragment, type ReactNode } from "react";
import { MediaThumb, type ThumbMedia } from "@/components/media/media-thumb";
import type { RichBlock, RichDoc, RichInline } from "./schema";

/**
 * Server-side renderer. SPEC.md §13: "render through a whitelist, never
 * `dangerouslySetInnerHTML` on user input."
 *
 * Every branch below emits real React elements. There is no HTML string
 * anywhere in this file, so there is nothing for a payload to be injected into
 * even if the sanitizer were bypassed.
 */

export type MediaLookup = Map<string, ThumbMedia & { alt: string | null }>;

function renderInline(nodes: RichInline[] | undefined): ReactNode {
  return (nodes ?? []).map((node, i) => {
    if (node.type === "hardBreak") return <br key={i} />;

    let out: ReactNode = node.text;
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") out = <strong key={`b${i}`}>{out}</strong>;
      else if (mark.type === "italic") out = <em key={`i${i}`}>{out}</em>;
      else if (mark.type === "link") {
        const external = /^https?:\/\//i.test(mark.attrs.href);
        out = (
          <a
            key={`l${i}`}
            href={mark.attrs.href}
            className="text-(--color-brand) underline underline-offset-2 hover:text-(--color-brand-hover)"
            // rel is set for every external link, not just LINE ones (§13).
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {out}
          </a>
        );
      }
    }
    return <Fragment key={i}>{out}</Fragment>;
  });
}

function renderBlock(block: RichBlock, key: number, media: MediaLookup): ReactNode {
  switch (block.type) {
    case "paragraph":
      return (
        <p key={key} className="my-4 leading-[1.8]">
          {renderInline(block.content)}
        </p>
      );

    case "heading": {
      const Tag = block.attrs.level === 2 ? "h2" : "h3";
      return (
        <Tag
          key={key}
          className={
            block.attrs.level === 2
              ? "mt-8 mb-3 text-2xl font-semibold"
              : "mt-6 mb-2 text-xl font-medium"
          }
        >
          {renderInline(block.content)}
        </Tag>
      );
    }

    case "bulletList":
      return (
        <ul key={key} className="my-4 list-disc space-y-1 ps-6">
          {block.content.map((li, i) => (
            <li key={i} className="leading-[1.8]">
              {li.content.map((p, j) => (
                <Fragment key={j}>{renderInline(p.content)}</Fragment>
              ))}
            </li>
          ))}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={key} className="my-4 list-decimal space-y-1 ps-6">
          {block.content.map((li, i) => (
            <li key={i} className="leading-[1.8]">
              {li.content.map((p, j) => (
                <Fragment key={j}>{renderInline(p.content)}</Fragment>
              ))}
            </li>
          ))}
        </ol>
      );

    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-5 border-s-2 border-(--color-brand) ps-4 text-(--color-text)"
        >
          {block.content.map((p, i) => (
            <p key={i} className="leading-[1.8]">
              {renderInline(p.content)}
            </p>
          ))}
        </blockquote>
      );

    case "horizontalRule":
      return <hr key={key} className="my-8 border-(--color-border)" />;

    case "image": {
      const found = media.get(block.attrs.mediaId);
      // A referenced image that no longer exists renders as nothing, not as a
      // broken image icon (docs/DESIGN.md).
      if (!found) return null;
      return (
        <figure key={key} className="my-6">
          <MediaThumb
            media={{ ...found, alt: block.attrs.alt ?? found.alt }}
            width={800}
            aspect="cover"
            sizes="(max-width: 768px) 100vw, 720px"
          />
          {block.attrs.alt ? (
            <figcaption className="mt-2 text-sm text-(--color-text-muted)">
              {block.attrs.alt}
            </figcaption>
          ) : null}
        </figure>
      );
    }
  }
}

export function RichText({ doc, media }: { doc: RichDoc; media: MediaLookup }) {
  if (doc.content.length === 0) return null;
  return (
    <div className="text-(--color-text)">{doc.content.map((b, i) => renderBlock(b, i, media))}</div>
  );
}
