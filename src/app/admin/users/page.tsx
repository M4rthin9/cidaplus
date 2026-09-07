import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { Button, FormBanner } from "@/components/ui/field";

export const metadata = { title: "ผู้ดูแลระบบ" };

const THAI_DATE = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" });

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  await requireOwner();
  const { created, updated } = await searchParams;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      lockedUntil: users.lockedUntil,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return (
    <div className="space-y-6">
      {created ? <FormBanner kind="success">เพิ่มผู้ดูแลระบบเรียบร้อยแล้ว</FormBanner> : null}
      {updated ? <FormBanner kind="success">บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว</FormBanner> : null}

      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold">ผู้ดูแลระบบ</h1>
        <Link href="/admin/users/new" className="ms-auto">
          <Button>เพิ่มผู้ดูแลระบบ</Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-8 text-center">
          <p className="text-(--color-text)">ยังไม่มีผู้ดูแลระบบ</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-(--radius-card) border border-(--color-border) bg-(--color-bg)">
          <table className="w-full min-w-[40rem] text-start text-sm">
            <thead className="border-b border-(--color-border) text-(--color-text-muted)">
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  ชื่อ
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  อีเมล
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  สิทธิ์
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  สถานะ
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  เข้าสู่ระบบล่าสุด
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  <span className="sr-only">การจัดการ</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const locked = row.lockedUntil && row.lockedUntil.getTime() > Date.now();
                return (
                  <tr key={row.id} className="border-b border-(--color-border) last:border-0">
                    <td className="px-4 py-3 text-(--color-heading)">{row.name}</td>
                    <td className="px-4 py-3">{row.email}</td>
                    <td className="px-4 py-3">
                      {row.role === "owner" ? "ผู้ดูแลสูงสุด" : "ผู้แก้ไข"}
                    </td>
                    <td className="px-4 py-3">
                      {!row.isActive ? (
                        <span className="text-(--color-text-muted)">ปิดใช้งาน</span>
                      ) : locked ? (
                        <span className="text-(--color-brand)">ถูกระงับชั่วคราว</span>
                      ) : (
                        <span className="text-(--color-accent-ink)">ใช้งานอยู่</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-(--color-text-muted)">
                      {row.lastLoginAt ? THAI_DATE.format(row.lastLoginAt) : "ยังไม่เคยเข้าสู่ระบบ"}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <Link
                        href={`/admin/users/${row.id}`}
                        className="text-(--color-brand) hover:underline"
                      >
                        แก้ไข
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
