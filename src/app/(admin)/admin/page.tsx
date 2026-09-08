import { requireAdmin } from "@/lib/auth/session";
import { FormBanner } from "@/components/ui/field";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const user = await requireAdmin();
  const { denied } = await searchParams;

  return (
    <div className="space-y-6">
      {denied === "owner" ? (
        <FormBanner kind="error">
          เฉพาะผู้ดูแลสูงสุดเท่านั้นที่เข้าถึงหน้าจัดการผู้ดูแลระบบได้
        </FormBanner>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold">ภาพรวม</h1>
        <p className="mt-2 text-(--color-text)">
          ยินดีต้อนรับ {user.name} — เข้าสู่ระบบในสิทธิ์
          {user.role === "owner" ? "ผู้ดูแลสูงสุด" : "ผู้แก้ไข"}
        </p>
      </div>

      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-6">
        <h2 className="text-lg font-semibold">ยังไม่มีข้อมูลสรุป</h2>
        <p className="mt-2 text-(--color-text)">
          สถิติสินค้า พื้นที่จัดเก็บ และจำนวนคลิก LINE
          จะแสดงที่นี่เมื่อพัฒนาส่วนที่เกี่ยวข้องเสร็จแล้ว
        </p>
      </div>
    </div>
  );
}
