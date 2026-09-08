import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { contactMessages } from "@/db/schema";

/**
 * Unread enquiries, for the badge in the admin nav (SPEC.md §9: "Show an unread
 * count in the admin nav"). Archived messages are excluded — archiving marks an
 * enquiry as dealt with.
 *
 * Never throws: a badge is not worth a 500 on every admin page.
 */
export async function unreadMessageCount(): Promise<number> {
  try {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(contactMessages)
      .where(and(eq(contactMessages.isRead, false), eq(contactMessages.isArchived, false)));
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}
