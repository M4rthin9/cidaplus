import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { media, postI18n, posts, productI18n, products } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { restorePostAction } from "../posts/actions";
import { restoreProductAction } from "../products/actions";
import { restoreMediaAction } from "../media/actions";
import { RestoreButton } from "./restore-button";

export const metadata = { title: "ถังขยะ" };

/**
 * Soft-deleted content, and the only place it can be recovered from.
 *
 * Every admin list filters on `deleted_at is null`, so before this page a
 * delete was effectively permanent from the operator's side: the rows were
 * still in the database and the restore server actions existed, but nothing
 * reached them. SPEC.md §7 promises soft delete precisely so a mistake is
 * recoverable without a DBA, and CLAUDE.md lists restore among the flows a
 * non-developer administrator must be able to perform.
 *
 * Categories are deliberately absent: `products.category_id` is
 * `onDelete: "restrict"`, so a category with products cannot be deleted in the
 * first place, and the category delete path already checks usage before
 * allowing it.
 */
const THAI_DATE = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" });

export default async function TrashPage() {
  await requireAdmin();

  const [deletedProducts, deletedPosts, deletedMedia] = await Promise.all([
    db
      .select({
        id: products.id,
        name: productI18n.name,
        deletedAt: products.deletedAt,
      })
      .from(products)
      .innerJoin(
        productI18n,
        and(eq(productI18n.productId, products.id), eq(productI18n.locale, DEFAULT_LOCALE)),
      )
      .where(isNotNull(products.deletedAt))
      .orderBy(desc(products.deletedAt)),
    db
      .select({
        id: posts.id,
        type: posts.type,
        title: postI18n.title,
        deletedAt: posts.deletedAt,
      })
      .from(posts)
      .innerJoin(postI18n, and(eq(postI18n.postId, posts.id), eq(postI18n.locale, DEFAULT_LOCALE)))
      .where(isNotNull(posts.deletedAt))
      .orderBy(desc(posts.deletedAt)),
    db
      .select({ id: media.id, filename: media.filename, deletedAt: media.deletedAt })
      .from(media)
      .where(isNotNull(media.deletedAt))
      .orderBy(desc(media.deletedAt)),
  ]);

  const sections = [
    {
      key: "products",
      heading: "สินค้า",
      rows: deletedProducts.map((r) => ({
        id: r.id,
        label: r.name,
        note: null as string | null,
        deletedAt: r.deletedAt,
      })),
      action: restoreProductAction,
    },
    {
      key: "posts",
      heading: "ข่าวและกิจกรรม",
      rows: deletedPosts.map((r) => ({
        id: r.id,
        label: r.title,
        note: r.type === "event" ? "กิจกรรม" : "ข่าว",
        deletedAt: r.deletedAt,
      })),
      action: restorePostAction,
    },
    {
      key: "media",
      heading: "คลังภาพ",
      rows: deletedMedia.map((r) => ({
        id: r.id,
        label: r.filename,
        note: null as string | null,
        deletedAt: r.deletedAt,
      })),
      action: restoreMediaAction,
    },
  ];

  const total = sections.reduce((n, section) => n + section.rows.length, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">ถังขยะ</h1>
        <p className="mt-2 text-sm text-(--color-text-muted)">
          รายการที่ถูกลบจะถูกซ่อนจากเว็บไซต์แต่ยังไม่ถูกลบออกจากระบบ กู้คืนได้จากหน้านี้
          รายการที่กู้คืนจะกลับมาเป็นฉบับร่าง และต้องกดเผยแพร่อีกครั้งหากต้องการให้แสดงบนเว็บไซต์
        </p>
      </div>

      {total === 0 ? (
        <p className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) px-6 py-10 text-center text-(--color-text-muted)">
          ถังขยะว่าง ยังไม่มีรายการที่ถูกลบ
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.key}>
            <h2 className="text-lg font-medium">
              {section.heading}
              <span className="ms-2 text-sm font-normal text-(--color-text-muted)">
                {section.rows.length} รายการ
              </span>
            </h2>

            {section.rows.length === 0 ? (
              <p className="mt-3 text-sm text-(--color-text-muted)">ไม่มีรายการที่ถูกลบ</p>
            ) : (
              <ul className="mt-3 divide-y divide-(--color-border) rounded-(--radius-card) border border-(--color-border) bg-(--color-bg)">
                {section.rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-(--color-heading)">{row.label}</p>
                      <p className="text-xs text-(--color-text-muted)">
                        {row.note ? `${row.note} · ` : ""}
                        ลบเมื่อ {row.deletedAt ? THAI_DATE.format(row.deletedAt) : "—"}
                      </p>
                    </div>
                    <RestoreButton id={row.id} label={row.label} action={section.action} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </div>
  );
}
