import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { postI18n, posts } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_LOCALE, postPath } from "@/lib/slug";
import { localeTabs, mediaPickerItems } from "@/lib/catalog/queries";
import { fromPublishColumns } from "@/lib/validation/catalog";
import { Button, FormBanner } from "@/components/ui/field";
import { deletePostAction, updatePostAction } from "../actions";
import { PostForm } from "../post-form";

export const metadata = { title: "แก้ไขข่าว/กิจกรรม" };

function toLocalInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;

  const [row] = await db
    .select()
    .from(posts)
    .innerJoin(postI18n, and(eq(postI18n.postId, posts.id), eq(postI18n.locale, DEFAULT_LOCALE)))
    .where(eq(posts.id, id))
    .limit(1);

  if (!row) notFound();

  const [media, locales] = await Promise.all([mediaPickerItems(), localeTabs("post", id)]);
  const p = row.posts;
  const i = row.post_i18n;
  const action = updatePostAction.bind(null, id);

  return (
    <div className="space-y-6">
      {created ? <FormBanner kind="success">เพิ่มเรียบร้อยแล้ว</FormBanner> : null}
      <div>
        <Link href="/admin/posts" className="text-sm text-(--color-brand) hover:underline">
          ← กลับไปหน้าข่าวและกิจกรรม
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">แก้ไข {i.title}</h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">{postPath(DEFAULT_LOCALE, i.slug)}</p>
      </div>

      <PostForm
        action={action}
        mode="edit"
        media={media}
        locales={locales}
        defaults={{
          type: p.type,
          title: i.title,
          slug: i.slug,
          excerpt: i.excerpt ?? "",
          body: i.body ?? { type: "doc", content: [] },
          coverMediaId: p.coverMediaId ?? "",
          publishState: fromPublishColumns(p.isPublished, p.publishedAt),
          publishedAt: toLocalInput(p.publishedAt),
          eventStartAt: toLocalInput(p.eventStartAt),
          eventEndAt: toLocalInput(p.eventEndAt),
          eventLocation: p.eventLocation ?? "",
        }}
      />

      <section className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-6">
        <h2 className="text-lg font-semibold">ลบ</h2>
        <p className="mt-2 text-(--color-text)">จะถูกซ่อนจากเว็บไซต์ และกู้คืนได้ภายหลัง</p>
        <form
          className="mt-4"
          action={async () => {
            "use server";
            await deletePostAction(id);
          }}
        >
          <Button type="submit" variant="danger">
            ลบข่าว/กิจกรรม
          </Button>
        </form>
      </section>
    </div>
  );
}
