"use server";

import { rm } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { media, mediaI18n } from "@/db/schema";
import { diffFields, writeAudit } from "@/lib/audit";
import { NotAuthorizedError, requireAdmin, type AdminUser } from "@/lib/auth/session";
import { MediaRejected, processUpload } from "@/lib/media/pipeline";
import { keyDirectory } from "@/lib/media/storage";
import { getMediaUsage, describeUsage } from "@/lib/media/usage";
import { fieldErrors } from "@/lib/validation/user";
import { altSchema, updateMediaSchema } from "@/lib/validation/media";

const FALLBACK_LOCALE = "th";

export type MediaFormState = {
  readonly errors?: Record<string, string>;
  readonly message?: string;
  readonly uploaded?: number;
};

async function actor(): Promise<AdminUser> {
  return requireAdmin();
}

/**
 * Multi-file upload. Each file is processed independently so one bad file in a
 * drag-and-drop of twenty does not discard the other nineteen.
 */
export async function uploadMediaAction(
  _prev: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const user = await actor();

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { message: "กรุณาเลือกไฟล์ภาพอย่างน้อยหนึ่งไฟล์" };

  // alt is required up front: §9 wants alt_th enforced before publish, and asking
  // once at upload is kinder than blocking a publish later with no context.
  const alt = altSchema.safeParse(formData.get("alt"));
  if (!alt.success) return { errors: fieldErrors(alt.error) };

  const failures: string[] = [];
  let uploaded = 0;

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const processed = await processUpload(buffer, file.name);

      await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(media)
          .values({
            filename: processed.filename,
            storageKey: processed.storageKey,
            mime: processed.mime,
            width: processed.width,
            height: processed.height,
            bytes: processed.bytes,
            blurhash: processed.blurhash,
            focalX: processed.focalX,
            focalY: processed.focalY,
            originalKept: processed.originalKept,
            uploadedBy: user.id,
          })
          .returning();
        if (!row) throw new Error("insert returned no row");

        await tx
          .insert(mediaI18n)
          .values({ mediaId: row.id, locale: FALLBACK_LOCALE, alt: alt.data });

        await writeAudit(tx, {
          userId: user.id,
          entity: "media",
          entityId: row.id,
          action: "create",
          diff: diffFields(null, {
            filename: row.filename,
            storageKey: row.storageKey,
            mime: row.mime,
            bytes: row.bytes,
          }),
        });
      });

      uploaded += 1;
    } catch (error) {
      if (error instanceof MediaRejected) failures.push(`${file.name}: ${error.message}`);
      else failures.push(`${file.name}: ประมวลผลไฟล์ไม่สำเร็จ`);
    }
  }

  revalidatePath("/admin/media");

  if (failures.length > 0) {
    return {
      uploaded,
      message: `อัปโหลดสำเร็จ ${uploaded} ไฟล์ · ไม่สำเร็จ: ${failures.join(" · ")}`,
    };
  }
  return { uploaded };
}

export async function updateMediaAction(
  mediaId: string,
  _prev: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const user = await actor();

  const parsed = updateMediaSchema.safeParse({
    alt: formData.get("alt"),
    tags: formData.get("tags") ?? "",
    focalX: formData.get("focalX"),
    focalY: formData.get("focalY"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const [before] = await db.select().from(media).where(eq(media.id, mediaId)).limit(1);
  if (!before) return { message: "ไม่พบไฟล์ภาพนี้" };

  const [beforeAlt] = await db
    .select({ alt: mediaI18n.alt })
    .from(mediaI18n)
    .where(eq(mediaI18n.mediaId, mediaId))
    .limit(1);

  await db.transaction(async (tx) => {
    const [after] = await tx
      .update(media)
      .set({ tags: parsed.data.tags, focalX: parsed.data.focalX, focalY: parsed.data.focalY })
      .where(eq(media.id, mediaId))
      .returning();
    if (!after) throw new Error("update returned no row");

    await tx
      .insert(mediaI18n)
      .values({ mediaId, locale: FALLBACK_LOCALE, alt: parsed.data.alt })
      .onConflictDoUpdate({
        target: [mediaI18n.mediaId, mediaI18n.locale],
        set: { alt: parsed.data.alt },
      });

    await writeAudit(tx, {
      userId: user.id,
      entity: "media",
      entityId: mediaId,
      action: "update",
      diff: diffFields(
        { tags: before.tags, focalX: before.focalX, focalY: before.focalY, alt: beforeAlt?.alt },
        { tags: after.tags, focalX: after.focalX, focalY: after.focalY, alt: parsed.data.alt },
      ),
    });
  });

  revalidatePath("/admin/media");
  revalidatePath(`/admin/media/${mediaId}`);
  return { message: "บันทึกเรียบร้อยแล้ว" };
}

/**
 * Soft delete (CLAUDE.md). Files stay on disk: a soft-deleted row can be
 * restored, and unlinking here would make that a lie. Purging orphaned
 * directories is a housekeeping job, not part of this action.
 */
export async function deleteMediaAction(mediaId: string): Promise<MediaFormState> {
  const user = await actor();

  const usage = await getMediaUsage(mediaId);
  if (usage.total > 0) {
    return { message: `ลบไม่ได้ ภาพนี้ถูกใช้งานอยู่: ${describeUsage(usage).join(" · ")}` };
  }

  const [before] = await db.select().from(media).where(eq(media.id, mediaId)).limit(1);
  if (!before) return { message: "ไม่พบไฟล์ภาพนี้" };
  if (before.deletedAt) return { message: "ภาพนี้ถูกลบไปแล้ว" };

  await db.transaction(async (tx) => {
    const [after] = await tx
      .update(media)
      .set({ deletedAt: new Date() })
      .where(eq(media.id, mediaId))
      .returning();
    if (!after) throw new Error("update returned no row");

    await writeAudit(tx, {
      userId: user.id,
      entity: "media",
      entityId: mediaId,
      action: "delete",
      diff: diffFields({ deletedAt: null }, { deletedAt: after.deletedAt }),
    });
  });

  revalidatePath("/admin/media");
  return { message: "ลบภาพเรียบร้อยแล้ว" };
}

export async function restoreMediaAction(mediaId: string): Promise<MediaFormState> {
  const user = await actor();

  await db.transaction(async (tx) => {
    await tx.update(media).set({ deletedAt: null }).where(eq(media.id, mediaId));
    await writeAudit(tx, {
      userId: user.id,
      entity: "media",
      entityId: mediaId,
      action: "restore",
      diff: { deletedAt: { from: "set", to: null } },
    });
  });

  revalidatePath("/admin/media");
  return { message: "กู้คืนภาพเรียบร้อยแล้ว" };
}

/** Permanent removal, files included. Only reachable for an already soft-deleted row. */
export async function purgeMediaAction(mediaId: string): Promise<MediaFormState> {
  const user = await actor();
  if (user.role !== "owner") throw new NotAuthorizedError();

  const [row] = await db.select().from(media).where(eq(media.id, mediaId)).limit(1);
  if (!row) return { message: "ไม่พบไฟล์ภาพนี้" };
  if (!row.deletedAt) return { message: "ต้องลบภาพก่อนจึงจะลบถาวรได้" };

  const usage = await getMediaUsage(mediaId);
  if (usage.total > 0) {
    return { message: `ลบถาวรไม่ได้ ภาพนี้ยังถูกใช้งานอยู่: ${describeUsage(usage).join(" · ")}` };
  }

  await db.transaction(async (tx) => {
    await writeAudit(tx, {
      userId: user.id,
      entity: "media",
      entityId: mediaId,
      action: "purge",
      diff: { storageKey: { from: row.storageKey, to: null } },
    });
    await tx.delete(media).where(eq(media.id, mediaId));
  });

  // Files last: a failure here leaves an orphaned directory, which is
  // recoverable. Deleting files first and then failing the row would leave the
  // library pointing at nothing.
  await rm(keyDirectory(row.storageKey), { recursive: true, force: true }).catch(() => undefined);

  revalidatePath("/admin/media");
  return { message: "ลบถาวรเรียบร้อยแล้ว" };
}
