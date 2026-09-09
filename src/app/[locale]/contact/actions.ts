"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { contactMessages } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { sendMail } from "@/lib/mail";
import { pepperedHash } from "@/lib/privacy";
import { TokenBucket } from "@/lib/rate-limit";
import { getSetting } from "@/lib/settings/store";
import {
  contactSchema,
  type ContactFieldErrors,
  type ContactFormState,
  type ContactValues,
} from "@/lib/validation/contact";

/**
 * §13: rate-limit the contact form; an in-memory token bucket is fine at this
 * scale. 5 messages, refilling one per two minutes.
 */
declare global {
  var __cidaContactRateLimit: TokenBucket | undefined;
}

const rateLimit: TokenBucket =
  globalThis.__cidaContactRateLimit ??
  (globalThis.__cidaContactRateLimit = new TokenBucket(5, 1 / 120));

async function clientIp(): Promise<string> {
  const h = await headers();
  // Cloudflare sits in front (§11); its header is the trustworthy one there.
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf;
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}

export async function submitContactAction(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "contact" });

  const read = (field: string): string => {
    const value = formData.get(field);
    return typeof value === "string" ? value : "";
  };

  // Echoed back on every rejected path so the reset restores the visitor's text.
  const values: ContactValues = {
    name: read("name"),
    email: read("email"),
    phone: read("phone"),
    subject: read("subject"),
    body: read("body"),
  };

  const ip = await clientIp();
  const limit = rateLimit.check(ip);
  if (!limit.allowed) {
    return {
      status: "error",
      message: t("tooMany", { seconds: limit.retryAfterSeconds }),
      values,
    };
  }

  const parsed = contactSchema.safeParse({ ...values, website: read("website") });

  if (!parsed.success) {
    const errors: ContactFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !(field in errors)) {
        errors[field as keyof ContactFieldErrors] = issue.message;
      }
    }
    return { status: "error", errors, values };
  }

  // Honeypot: answer exactly as if it had worked. Telling a bot it was detected
  // only teaches whoever wrote it to stop filling the field.
  if (parsed.data.website) return { status: "success", message: t("success") };

  const headerList = await headers();
  const sourcePath = headerList.get("x-pathname") ?? "/contact";

  /**
   * The row is written first and the mail attempted afterwards, outside the
   * transaction. Losing an enquiry is the worst failure this site can have
   * (CLAUDE.md), so nothing about the notification may be able to roll it back.
   */
  let messageId: string;
  try {
    messageId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(contactMessages)
        .values({
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone ?? null,
          subject: parsed.data.subject ?? null,
          body: parsed.data.body,
          locale,
          sourcePath: sourcePath.slice(0, 512),
          ipHash: pepperedHash(ip),
        })
        .returning({ id: contactMessages.id });

      if (!row) throw new Error("insert returned no row");

      /**
       * No user id — this is a visitor, not an operator. The diff carries the
       * subject only: the enquiry body is personal data and already lives in
       * one place, and copying it into `audit_log` would put it beyond the
       * reach of a deletion request.
       */
      await writeAudit(tx, {
        userId: null,
        entity: "contact_message",
        entityId: row.id,
        action: "create",
        diff: { subject: { from: null, to: parsed.data.subject ?? null } },
      });

      return row.id;
    });
  } catch (error) {
    console.error("[contact] failed to store message:", error);
    return { status: "error", message: t("failure"), values };
  }

  const contact = await getSetting("contact", locale);
  if (contact.email) {
    const result = await sendMail({
      to: contact.email,
      replyTo: parsed.data.email,
      subject: `[cidapt.com] ${parsed.data.subject ?? parsed.data.name}`,
      text: [
        `ชื่อ: ${parsed.data.name}`,
        `อีเมล: ${parsed.data.email}`,
        parsed.data.phone ? `โทรศัพท์: ${parsed.data.phone}` : null,
        `หน้า: ${sourcePath}`,
        "",
        parsed.data.body,
      ]
        .filter((line): line is string => line !== null)
        .join("\n"),
    });

    // `emailed_at` staying null is an expected state, not an error — it is what
    // the admin inbox uses to show which enquiries were never notified.
    if (result.sent) {
      await db
        .update(contactMessages)
        .set({ emailedAt: new Date() })
        .where(eq(contactMessages.id, messageId));
    }
  }

  return { status: "success", message: t("success") };
}
