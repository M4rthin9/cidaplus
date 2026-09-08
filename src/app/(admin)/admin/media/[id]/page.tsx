import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { media, mediaI18n } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatBytes } from "@/lib/media/pipeline";
import { DERIVATIVE_FORMATS, DERIVATIVE_WIDTHS } from "@/lib/media/constants";
import { derivativeName, mediaUrl } from "@/lib/media/urls";
import { describeUsage, getMediaUsage } from "@/lib/media/usage";
import { Button, FormBanner } from "@/components/ui/field";
import { deleteMediaAction, restoreMediaAction } from "../actions";
import { MediaDetailForm } from "./media-detail-form";

export const metadata = { title: "รายละเอียดภาพ" };

export default async function MediaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [row] = await db
    .select({
      id: media.id,
      storageKey: media.storageKey,
      filename: media.filename,
      mime: media.mime,
      width: media.width,
      height: media.height,
      bytes: media.bytes,
      tags: media.tags,
      blurhash: media.blurhash,
      focalX: media.focalX,
      focalY: media.focalY,
      originalKept: media.originalKept,
      deletedAt: media.deletedAt,
      alt: mediaI18n.alt,
    })
    .from(media)
    .leftJoin(mediaI18n, eq(mediaI18n.mediaId, media.id))
    .where(eq(media.id, id))
    .limit(1);

  if (!row) notFound();

  const usage = await getMediaUsage(id);
  const inUse = describeUsage(usage);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/media" className="text-sm text-(--color-brand) hover:underline">
          ← กลับไปคลังภาพ
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{row.filename}</h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          {row.width}×{row.height} · {row.mime} · {formatBytes(row.bytes)} ·{" "}
          {row.originalKept ? "เก็บไฟล์ต้นฉบับไว้" : "ลบไฟล์ต้นฉบับเพื่อประหยัดพื้นที่"}
        </p>
      </div>

      {row.deletedAt ? (
        <FormBanner kind="error">ภาพนี้ถูกลบแล้ว จะไม่แสดงในคลังภาพ</FormBanner>
      ) : null}

      <MediaDetailForm
        mediaId={row.id}
        storageKey={row.storageKey}
        defaults={{
          alt: row.alt ?? "",
          tags: (row.tags ?? []).join(", "),
          focalX: row.focalX,
          focalY: row.focalY,
        }}
      />

      <section className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-6">
        <h2 className="text-lg font-semibold">ไฟล์ที่สร้างขึ้น</h2>
        <p className="mt-1 text-sm text-(--color-text-muted)">blurhash: {row.blurhash ?? "—"}</p>
        <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          {DERIVATIVE_WIDTHS.flatMap((w) =>
            DERIVATIVE_FORMATS.map((f) => (
              <li key={`${w}-${f}`}>
                <a
                  href={mediaUrl(row.storageKey, derivativeName(w, f))}
                  className="text-(--color-brand) hover:underline"
                >
                  {derivativeName(w, f)}
                </a>
              </li>
            )),
          )}
        </ul>
      </section>

      <section className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-6">
        <h2 className="text-lg font-semibold">การใช้งาน</h2>
        {inUse.length === 0 ? (
          <p className="mt-2 text-(--color-text)">ยังไม่ถูกใช้งานที่ใด ลบได้อย่างปลอดภัย</p>
        ) : (
          <p className="mt-2 text-(--color-text)">
            ถูกใช้งานใน {usage.total} รายการ — {inUse.join(" · ")}
          </p>
        )}

        <form
          className="mt-4"
          action={async () => {
            "use server";
            if (row.deletedAt) await restoreMediaAction(row.id);
            else await deleteMediaAction(row.id);
          }}
        >
          <Button type="submit" variant={row.deletedAt ? "secondary" : "danger"}>
            {row.deletedAt ? "กู้คืนภาพ" : "ลบภาพ"}
          </Button>
        </form>
      </section>
    </div>
  );
}
