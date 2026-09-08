import Link from "next/link";
import { desc, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { media, mediaI18n } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/session";
import { formatBytes } from "@/lib/media/pipeline";
import { getMediaDiskUsage } from "@/lib/media/usage";
import { MediaThumb } from "@/components/media/media-thumb";
import { UploadForm } from "./upload-form";

export const metadata = { title: "คลังภาพ" };

export default async function MediaPage() {
  await requireAdmin();

  const rows = await db
    .select({
      id: media.id,
      storageKey: media.storageKey,
      filename: media.filename,
      bytes: media.bytes,
      width: media.width,
      height: media.height,
      blurhash: media.blurhash,
      focalX: media.focalX,
      focalY: media.focalY,
      originalKept: media.originalKept,
      alt: mediaI18n.alt,
    })
    .from(media)
    .leftJoin(mediaI18n, eq(mediaI18n.mediaId, media.id))
    .where(isNull(media.deletedAt))
    .orderBy(desc(media.createdAt))
    .limit(120);

  const disk = await getMediaDiskUsage();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-4">
        <h1 className="text-2xl font-semibold">คลังภาพ</h1>
        <p className="text-sm text-(--color-text-muted)">
          {disk.files} ไฟล์ · ใช้พื้นที่ {formatBytes(disk.bytes)}
        </p>
      </div>

      <UploadForm />

      {rows.length === 0 ? (
        <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-8 text-center">
          <p className="text-(--color-text)">ยังไม่มีรูปภาพในคลัง</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {rows.map((m) => (
            <li key={m.id}>
              <Link href={`/admin/media/${m.id}`} className="block">
                <MediaThumb media={m} width={400} aspect="square" />
                <p className="mt-2 truncate text-sm text-(--color-heading)">{m.filename}</p>
                <p className="truncate text-xs text-(--color-text-muted)">
                  {m.width}×{m.height} · {formatBytes(m.bytes)}
                  {m.originalKept ? "" : " · ต้นฉบับถูกลบ"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
