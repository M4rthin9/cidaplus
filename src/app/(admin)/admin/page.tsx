import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { RETENTION_DAYS, clickTotals, clicksByDay, clicksByProduct } from "@/lib/clicks";
import { FormBanner } from "@/components/ui/field";
import { ClickChart } from "./click-chart";

/** Clicks are the live conversion signal; a cached dashboard would misreport it. */
export const dynamic = "force-dynamic";

function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-5">
      <p className="text-sm text-(--color-text-muted)">{label}</p>
      {/* The number is the point, so it is set as a figure rather than body text. */}
      <p className="lat mt-1 text-3xl font-semibold text-(--color-heading)">{value}</p>
      {hint && <p className="mt-1 text-[13px] text-(--color-text-muted)">{hint}</p>}
    </div>
  );
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const user = await requireAdmin();
  const { denied } = await searchParams;

  const [totals, daily, byProduct] = await Promise.all([
    clickTotals(),
    clicksByDay(),
    clicksByProduct(),
  ]);

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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={`คลิก LINE ${RETENTION_DAYS} วันล่าสุด`}
          value={totals.window}
          hint="ระบบเก็บข้อมูลย้อนหลังเท่านี้"
        />
        <StatTile label="คลิก LINE 7 วันล่าสุด" value={totals.lastSevenDays} />
        <StatTile
          label="คลิกที่ไม่ระบุสินค้า"
          value={totals.unattributed}
          hint="จากส่วนหัว ส่วนท้าย หน้าติดต่อ และหน้าหมวดหมู่"
        />
      </div>

      <section
        aria-labelledby="clicks-chart"
        className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-6"
      >
        <h2 id="clicks-chart" className="text-lg font-semibold">
          คลิก LINE รายวัน
        </h2>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          จำนวนครั้งที่ผู้เข้าชมกดปุ่มติดต่อทาง LINE ใน {RETENTION_DAYS} วันล่าสุด
        </p>

        <div className="mt-6">
          {totals.window === 0 ? (
            <p className="text-(--color-text-muted)">
              ยังไม่มีคลิกในช่วงนี้ กราฟจะแสดงเมื่อมีผู้เข้าชมกดปุ่มติดต่อทาง LINE
            </p>
          ) : (
            <ClickChart data={daily} />
          )}
        </div>
      </section>

      <section
        aria-labelledby="clicks-by-product"
        className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-6"
      >
        <h2 id="clicks-by-product" className="text-lg font-semibold">
          สินค้าที่ถูกสอบถามมากที่สุด
        </h2>

        {byProduct.length === 0 ? (
          <p className="mt-3 text-(--color-text-muted)">ยังไม่มีการสอบถามสินค้าผ่าน LINE</p>
        ) : (
          <ol className="mt-4 divide-y divide-(--color-border)">
            {byProduct.slice(0, 8).map((row) => (
              <li key={row.productId} className="flex items-center justify-between gap-4 py-2.5">
                <Link
                  href={`/admin/products/${row.productId}`}
                  className="text-sm text-(--color-brand) hover:text-(--color-brand-hover)"
                >
                  {row.name}
                </Link>
                <span className="lat text-sm font-medium text-(--color-heading)">{row.clicks}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-6">
        <h2 className="text-lg font-semibold">ยังไม่มีข้อมูลสรุปส่วนอื่น</h2>
        <p className="mt-2 text-(--color-text)">
          สถิติสินค้า พื้นที่จัดเก็บ และรายงานสินค้าที่ยังไม่มีรูปภาพ
          จะแสดงที่นี่เมื่อพัฒนาส่วนที่เกี่ยวข้องเสร็จแล้ว
        </p>
      </div>
    </div>
  );
}
