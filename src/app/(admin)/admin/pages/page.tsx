import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { pageI18n, pages } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { HOME_PAGE_KEY } from "@/lib/pages/store";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { Button, FormBanner } from "@/components/ui/field";

export const metadata: Metadata = { title: "หน้าเว็บ" };

/** §5: "/admin/pages — Static pages + homepage section builder". */
export default async function PagesListPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  await requireAdmin();
  const { deleted } = await searchParams;

  const rows = await db
    .select({
      id: pages.id,
      key: pages.key,
      isPublished: pages.isPublished,
      title: pageI18n.title,
      slug: pageI18n.slug,
      sections: pageI18n.sections,
    })
    .from(pages)
    .innerJoin(pageI18n, and(eq(pageI18n.pageId, pages.id), eq(pageI18n.locale, DEFAULT_LOCALE)))
    .orderBy(asc(pages.key));

  return (
    <div className="space-y-6">
      {deleted ? <FormBanner kind="success">ลบหน้าเรียบร้อยแล้ว</FormBanner> : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">หน้าเว็บ</h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">
            หน้าแรกและหน้าเนื้อหาคงที่ จัดวางด้วยบล็อกพร้อมตัวอย่างสด
          </p>
        </div>
        <Link href="/admin/pages/new">
          <Button type="button">สร้างหน้าใหม่</Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-6">
          <p className="text-(--color-text)">
            ยังไม่มีหน้าใดในระบบ หน้าแรกกำลังแสดงผลด้วยการจัดวางมาตรฐานที่ติดมากับเว็บไซต์
            สร้างหน้าที่มีรหัส <span className="lat">home</span> เพื่อเริ่มแก้ไขการจัดวาง
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-4 rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) px-4 py-3"
            >
              <Link
                href={`/admin/pages/${row.id}`}
                className="font-medium text-(--color-heading) hover:underline"
              >
                {row.title}
              </Link>
              <span className="lat text-sm text-(--color-text-muted)">
                {row.key === HOME_PAGE_KEY ? "/" : `/${row.slug}`}
              </span>
              <span className="text-sm text-(--color-text-muted)">
                {Array.isArray(row.sections) ? row.sections.length : 0} บล็อก
              </span>
              <span
                className={
                  row.isPublished
                    ? "ms-auto rounded-(--radius-control) bg-(--color-accent-tint) px-2 py-0.5 text-xs text-(--color-accent-ink)"
                    : "ms-auto rounded-(--radius-control) bg-(--color-surface) px-2 py-0.5 text-xs text-(--color-text-muted)"
                }
              >
                {row.isPublished ? "เผยแพร่" : "ฉบับร่าง"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
