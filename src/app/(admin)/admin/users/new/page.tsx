import Link from "next/link";
import { requireOwner } from "@/lib/auth/session";
import { createUserAction } from "../actions";
import { UserForm } from "../user-form";

export const metadata = { title: "เพิ่มผู้ดูแลระบบ" };

export default async function NewUserPage() {
  await requireOwner();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-(--color-brand) hover:underline">
          ← กลับไปหน้าผู้ดูแลระบบ
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">เพิ่มผู้ดูแลระบบ</h1>
      </div>
      <UserForm action={createUserAction} mode="create" />
    </div>
  );
}
