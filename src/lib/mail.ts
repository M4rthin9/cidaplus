import "server-only";

import nodemailer from "nodemailer";
import { assertEnv, hasSmtp } from "@/lib/env";

/**
 * Outbound mail. SPEC.md §9 and §14 decision 5.
 *
 * SMTP is not provisioned. Everything here is best-effort by design: the caller
 * has already written the row, and this only decides whether a notification
 * also goes out. It never throws — "a contact form that silently drops
 * enquiries because an env var is missing is the worst possible failure on a
 * site whose entire purpose is enquiries", and the mirror of that is a form
 * that 500s because the mail server refused a connection.
 */
export type MailResult = { sent: boolean; reason?: string };

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<MailResult> {
  const env = assertEnv();
  if (!hasSmtp(env)) return { sent: false, reason: "smtp-not-configured" };

  try {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      // 465 is implicit TLS; everything else negotiates STARTTLS.
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });

    await transport.sendMail({
      from: env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      replyTo: options.replyTo,
    });

    return { sent: true };
  } catch (error) {
    // Logged, not raised. The enquiry is already safe in the database.
    console.error("[mail] send failed:", error instanceof Error ? error.message : error);
    return { sent: false, reason: "send-failed" };
  }
}
