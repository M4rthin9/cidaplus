import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "ประวัติการแก้ไข" };

const THAI_DATE = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "medium" });

const ACTION_LABEL: Record<string, string> = {
  create: "เพิ่ม",
  update: "แก้ไข",
  delete: "ลบ",
  purge: "ลบถาวร",
  reorder: "จัดลำดับ",
  restore: "กู้คืน",
  "login.success": "เข้าสู่ระบบสำเร็จ",
  "login.failure": "เข้าสู่ระบบไม่สำเร็จ",
  "login.locked": "ถูกระงับชั่วคราว",
  logout: "ออกจากระบบ",
};

const ENTITY_LABEL: Record<string, string> = {
  users: "ผู้ดูแลระบบ",
  auth: "การเข้าสู่ระบบ",
  media: "คลังภาพ",
  categories: "หมวดหมู่",
  products: "สินค้า",
  posts: "ข่าวและกิจกรรม",
  settings: "ตั้งค่า",
};

export default async function AuditPage() {
  await requireAdmin();

  const rows = await db
    .select({
      id: auditLog.id,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      action: auditLog.action,
      diff: auditLog.diff,
      createdAt: auditLog.createdAt,
      actorName: users.name,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.userId))
    .orderBy(desc(auditLog.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ประวัติการแก้ไข</h1>
        <p className="mt-2 text-(--color-text)">แสดง 100 รายการล่าสุด</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-8 text-center">
          <p className="text-(--color-text)">ยังไม่มีประวัติการแก้ไข</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-(--radius-card) border border-(--color-border) bg-(--color-bg)">
          <table className="w-full min-w-[44rem] text-start text-sm">
            <thead className="border-b border-(--color-border) text-(--color-text-muted)">
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  เวลา
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  ผู้ดำเนินการ
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  ส่วน
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  การกระทำ
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  รายละเอียด
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-(--color-border) align-top last:border-0"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-(--color-text-muted)">
                    {THAI_DATE.format(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">{row.actorName ?? "ระบบ"}</td>
                  <td className="px-4 py-3">{ENTITY_LABEL[row.entity] ?? row.entity}</td>
                  <td className="px-4 py-3 text-(--color-heading)">
                    {ACTION_LABEL[row.action] ?? row.action}
                  </td>
                  <td className="px-4 py-3">
                    <pre className="max-w-md overflow-x-auto text-xs text-(--color-text-muted)">
                      {JSON.stringify(row.diff, null, 1)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
