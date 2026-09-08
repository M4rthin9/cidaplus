import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/session";
import { ADMIN_HOME } from "@/lib/auth/config";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ — ระบบจัดการเว็บไซต์" };

export default async function LoginPage() {
  if (await getAdminUser()) redirect(ADMIN_HOME);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-8">
        <p className="text-sm text-(--color-text-muted)">ทัณฑสถานบำบัดพิเศษกลาง</p>
        <h1 className="mt-1 text-2xl font-semibold">ระบบจัดการเว็บไซต์</h1>
        <div
          className="mt-4 mb-6 h-0.5 w-12 rounded-full bg-(--color-seal-gold)"
          aria-hidden="true"
        />
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-(--color-text-muted)">
        สำหรับเจ้าหน้าที่ผู้ดูแลระบบเท่านั้น
      </p>
    </main>
  );
}
