"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { contactMessages } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/session";

/**
 * Inbox mutations. Every one writes an audit row (CLAUDE.md) — who read an
 * enquiry and who archived it is exactly the kind of thing an institution needs
 * to be able to answer.
 *
 * `requireAdmin()` is the authoritative check, not the middleware.
 */
export async function setMessageReadAction(id: string, isRead: boolean): Promise<void> {
  const user = await requireAdmin();

  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ isRead: contactMessages.isRead })
      .from(contactMessages)
      .where(eq(contactMessages.id, id));
    if (!before || before.isRead === isRead) return;

    await tx.update(contactMessages).set({ isRead }).where(eq(contactMessages.id, id));
    await writeAudit(tx, {
      userId: user.id,
      entity: "contact_message",
      entityId: id,
      action: "update",
      diff: { isRead: { from: before.isRead, to: isRead } },
    });
  });

  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

export async function setMessageArchivedAction(id: string, isArchived: boolean): Promise<void> {
  const user = await requireAdmin();

  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ isArchived: contactMessages.isArchived, isRead: contactMessages.isRead })
      .from(contactMessages)
      .where(eq(contactMessages.id, id));
    if (!before || before.isArchived === isArchived) return;

    // Archiving implies it has been dealt with, so it is read too.
    await tx
      .update(contactMessages)
      .set({ isArchived, isRead: isArchived ? true : before.isRead })
      .where(eq(contactMessages.id, id));

    await writeAudit(tx, {
      userId: user.id,
      entity: "contact_message",
      entityId: id,
      action: "update",
      diff: { isArchived: { from: before.isArchived, to: isArchived } },
    });
  });

  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}
