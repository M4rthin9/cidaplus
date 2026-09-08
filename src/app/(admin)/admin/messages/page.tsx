import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { contactMessages } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { MessageRow } from "./message-row";

export const metadata: Metadata = { title: "กล่องข้อความ" };

/** Always current: an inbox showing a cached unread count is worse than useless. */
export const dynamic = "force-dynamic";

/**
 * The contact form inbox (SPEC.md §9). `emailed_at = null` is surfaced rather
 * than hidden: SMTP is not provisioned, so every enquiry currently arrives with
 * no notification sent, and the operator has to know that reading this page is
 * the only way they will see it.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireAdmin();

  const { view } = await searchParams;
  const archived = view === "archived";

  const rows = await db
    .select()
    .from(contactMessages)
    .where(eq(contactMessages.isArchived, archived))
    .orderBy(desc(contactMessages.createdAt))
    .limit(200);

  const [counts] = await db
    .select({
      unread: sql<number>`count(*) filter (where ${contactMessages.isRead} = false and ${contactMessages.isArchived} = false)::int`,
      inbox: sql<number>`count(*) filter (where ${contactMessages.isArchived} = false)::int`,
      archived: sql<number>`count(*) filter (where ${contactMessages.isArchived} = true)::int`,
      unsent: sql<number>`count(*) filter (where ${contactMessages.emailedAt} is null)::int`,
    })
    .from(contactMessages);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">กล่องข้อความ</h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">
            ข้อความจากแบบฟอร์มติดต่อบนเว็บไซต์ ยังไม่ได้อ่าน {counts?.unread ?? 0} รายการ
          </p>
        </div>

        <nav aria-label="มุมมอง" className="flex gap-2">
          <Link
            href="/admin/messages"
            aria-current={archived ? undefined : "page"}
            className={
              archived
                ? "rounded-(--radius-control) px-3 py-1.5 text-sm text-(--color-text)"
                : "rounded-(--radius-control) bg-(--color-brand-tint) px-3 py-1.5 text-sm font-medium text-(--color-brand)"
            }
          >
            กล่องขาเข้า ({counts?.inbox ?? 0})
          </Link>
          <Link
            href="/admin/messages?view=archived"
            aria-current={archived ? "page" : undefined}
            className={
              archived
                ? "rounded-(--radius-control) bg-(--color-brand-tint) px-3 py-1.5 text-sm font-medium text-(--color-brand)"
                : "rounded-(--radius-control) px-3 py-1.5 text-sm text-(--color-text)"
            }
          >
            เก็บถาวร ({counts?.archived ?? 0})
          </Link>
        </nav>
      </div>

      {(counts?.unsent ?? 0) > 0 && (
        <p className="mt-6 rounded-(--radius-card) bg-(--color-brand-tint) px-4 py-3 text-sm text-(--color-brand)">
          มี {counts?.unsent} ข้อความที่ยังไม่ได้ส่งอีเมลแจ้งเตือน
          เนื่องจากยังไม่ได้ตั้งค่าเซิร์ฟเวอร์อีเมล ข้อความทั้งหมดถูกบันทึกไว้ในระบบเรียบร้อยแล้ว
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-10 text-(--color-text-muted)">
          {archived ? "ยังไม่มีข้อความที่เก็บถาวร" : "ยังไม่มีข้อความเข้ามา"}
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {rows.map((row) => (
            <MessageRow key={row.id} message={{ ...row, createdAt: row.createdAt.toISOString() }} />
          ))}
        </ul>
      )}
    </div>
  );
}
