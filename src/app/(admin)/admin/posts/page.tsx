import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { postI18n, posts } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { fromPublishColumns } from "@/lib/validation/catalog";
import { Button, FormBanner } from "@/components/ui/field";

export const metadata = { title: "ข่าวและกิจกรรม" };

const THAI_DATE = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" });
const STATE_LABEL = { draft: "ฉบับร่าง", scheduled: "ตั้งเวลา", published: "เผยแพร่" } as const;

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; type?: string }>;
}) {
  await requireAdmin();
  const { deleted, type } = await searchParams;

  const rows = await db
    .select({
      id: posts.id,
      type: posts.type,
      isPublished: posts.isPublished,
      publishedAt: posts.publishedAt,
      eventStartAt: posts.eventStartAt,
      title: postI18n.title,
      slug: postI18n.slug,
    })
    .from(posts)
    .innerJoin(postI18n, and(eq(postI18n.postId, posts.id), eq(postI18n.locale, DEFAULT_LOCALE)))
    .where(isNull(posts.deletedAt))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt));

  const shown = type === "news" || type === "event" ? rows.filter((r) => r.type === type) : rows;

  return (
    <div className="space-y-6">
      {deleted ? <FormBanner kind="success">ลบเรียบร้อยแล้ว</FormBanner> : null}

      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold">ข่าวและกิจกรรม</h1>
        <Link href="/admin/posts/new" className="ms-auto">
          <Button>เพิ่มข่าว/กิจกรรม</Button>
        </Link>
      </div>

      <nav aria-label="กรองตามประเภท" className="flex flex-wrap gap-2 text-sm">
        {[
          { key: "", label: "ทั้งหมด" },
          { key: "news", label: "ข่าวประชาสัมพันธ์" },
          { key: "event", label: "กิจกรรม" },
        ].map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/admin/posts?type=${f.key}` : "/admin/posts"}
            aria-current={(type ?? "") === f.key ? "page" : undefined}
            className={
              "rounded-(--radius-control) px-3 py-1.5 " +
              ((type ?? "") === f.key
                ? "bg-(--color-brand-tint) text-(--color-brand)"
                : "text-(--color-text) hover:bg-(--color-surface)")
            }
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-8 text-center">
          <p className="text-(--color-text)">ยังไม่มีข่าวหรือกิจกรรม</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-(--radius-card) border border-(--color-border) bg-(--color-bg)">
          <table className="w-full min-w-[40rem] text-start text-sm">
            <thead className="border-b border-(--color-border) text-(--color-text-muted)">
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  หัวข้อ
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  ประเภท
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  สถานะ
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  วันที่
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-(--color-border) last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/posts/${r.id}`}
                      className="text-(--color-heading) hover:underline"
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {r.type === "event" ? "กิจกรรม" : "ข่าวประชาสัมพันธ์"}
                  </td>
                  <td className="px-4 py-3">
                    {STATE_LABEL[fromPublishColumns(r.isPublished, r.publishedAt)]}
                  </td>
                  <td className="px-4 py-3 text-(--color-text-muted)">
                    {r.type === "event" && r.eventStartAt
                      ? THAI_DATE.format(r.eventStartAt)
                      : r.publishedAt
                        ? THAI_DATE.format(r.publishedAt)
                        : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
