"use client";

import { useState, useTransition } from "react";
import { setMessageArchivedAction, setMessageReadAction } from "./actions";

export type InboxMessage = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  body: string;
  locale: string;
  sourcePath: string;
  isRead: boolean;
  isArchived: boolean;
  emailedAt: Date | null;
  createdAt: string;
};

/**
 * One enquiry, expandable in place. Opening it marks it read — the operator
 * should not have to do that by hand, and an inbox that needs two clicks per
 * message to stay accurate will drift.
 *
 * Reply is a `mailto:` (SPEC.md §5: "read, archive, reply-to mailto"), so the
 * reply lands in the institution's own mail client and its sent folder rather
 * than in a database nobody backs up separately.
 */
export function MessageRow({ message }: { message: InboxMessage }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const created = new Date(message.createdAt);
  const heading = message.subject ?? message.name;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !message.isRead) {
      startTransition(async () => {
        await setMessageReadAction(message.id, true);
      });
    }
  }

  return (
    <li
      className={`rounded-(--radius-card) border bg-(--color-bg) ${
        message.isRead ? "border-(--color-border)" : "border-(--color-brand)"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-start"
      >
        <span
          className={`text-sm ${
            message.isRead ? "text-(--color-heading)" : "font-semibold text-(--color-heading)"
          }`}
        >
          {heading}
        </span>
        <span className="text-sm text-(--color-text-muted)">{message.name}</span>
        {message.emailedAt === null && (
          <span className="rounded-(--radius-control) bg-(--color-brand-tint) px-2 py-0.5 text-xs text-(--color-brand)">
            ยังไม่ได้ส่งอีเมลแจ้งเตือน
          </span>
        )}
        <span className="ms-auto text-xs text-(--color-text-muted)">
          <time dateTime={created.toISOString()}>
            {created.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
          </time>
        </span>
      </button>

      {open && (
        <div className="border-t border-(--color-border) px-4 py-4">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-(--color-text-muted)">อีเมล</dt>
            <dd>
              <a
                href={`mailto:${message.email}`}
                className="text-(--color-brand) hover:text-(--color-brand-hover)"
              >
                {message.email}
              </a>
            </dd>

            {message.phone && (
              <>
                <dt className="text-(--color-text-muted)">โทรศัพท์</dt>
                <dd>
                  <a
                    href={`tel:${message.phone.replace(/[^\d+]/g, "")}`}
                    className="text-(--color-brand) hover:text-(--color-brand-hover)"
                  >
                    {message.phone}
                  </a>
                </dd>
              </>
            )}

            <dt className="text-(--color-text-muted)">ส่งจากหน้า</dt>
            <dd className="text-(--color-text)">{message.sourcePath}</dd>

            <dt className="text-(--color-text-muted)">ภาษา</dt>
            <dd className="text-(--color-text)">{message.locale}</dd>
          </dl>

          <p className="mt-4 whitespace-pre-wrap text-(--color-text)">{message.body}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`mailto:${message.email}?subject=${encodeURIComponent(`ตอบกลับ: ${heading}`)}`}
              className="rounded-(--radius-control) bg-(--color-brand) px-4 py-2.5 text-sm font-medium text-white hover:bg-(--color-brand-hover)"
            >
              ตอบกลับทางอีเมล
            </a>

            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await setMessageArchivedAction(message.id, !message.isArchived);
                })
              }
              className="rounded-(--radius-control) border border-(--color-border) px-4 py-2.5 text-sm text-(--color-text) disabled:opacity-60"
            >
              {message.isArchived ? "นำกลับกล่องขาเข้า" : "เก็บถาวร"}
            </button>

            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await setMessageReadAction(message.id, !message.isRead);
                })
              }
              className="rounded-(--radius-control) border border-(--color-border) px-4 py-2.5 text-sm text-(--color-text) disabled:opacity-60"
            >
              {message.isRead ? "ทำเครื่องหมายว่ายังไม่ได้อ่าน" : "ทำเครื่องหมายว่าอ่านแล้ว"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
