import { getTranslations } from "next-intl/server";
import { goLinePath } from "@/lib/line";
import { LineLink } from "./line-link";

/**
 * The LINE entry point every category page carries (SPEC.md §8 item 5).
 *
 * It has no product, so it points at `/go/line` with no `p` — the click is
 * still recorded, attributed to no product, and the visitor gets the
 * add-friend link rather than a chat pre-filled about nothing.
 *
 * Tinted rather than solid: docs/DESIGN.md forbids body text on
 * `--color-accent`, so the band uses `--color-accent-tint` with
 * `--color-accent-ink` (7.3:1) and keeps the solid green for the button.
 */
export async function LineBand() {
  const t = await getTranslations("line");

  return (
    <aside className="mt-16 flex flex-wrap items-center justify-between gap-6 rounded-(--radius-card) bg-(--color-accent-tint) px-6 py-6">
      <div>
        <h2 className="text-lg font-medium text-(--color-accent-ink)">{t("categoryCta")}</h2>
        <p className="mt-1 text-sm text-(--color-accent-ink)">{t("categoryCtaBody")}</p>
      </div>
      <LineLink href={goLinePath()}>{t("openAccount")}</LineLink>
    </aside>
  );
}
