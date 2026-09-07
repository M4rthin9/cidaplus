import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { updateUserAction } from "../actions";
import { UserForm } from "../user-form";

export const metadata = { title: "แก้ไขผู้ดูแลระบบ" };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) notFound();

  const action = updateUserAction.bind(null, user.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-(--color-brand) hover:underline">
          ← กลับไปหน้าผู้ดูแลระบบ
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">แก้ไข {user.name}</h1>
      </div>
      <UserForm action={action} mode="edit" defaults={user} />
    </div>
  );
}
