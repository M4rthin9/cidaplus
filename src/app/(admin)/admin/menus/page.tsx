import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { getMenuItems } from "@/lib/menus/store";
import { MENU_LOCATIONS } from "@/lib/menus/schema";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { MenuEditor } from "./menu-editor";

export const metadata: Metadata = { title: "เมนู" };

/** §5: "/admin/menus — Header/footer menu builder". */
export default async function MenusPage() {
  await requireAdmin();

  const saved = await Promise.all(
    MENU_LOCATIONS.map((location) => getMenuItems(location, DEFAULT_LOCALE)),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">เมนู</h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          จัดการเมนูส่วนหัวและส่วนท้ายของเว็บไซต์ ลากเพื่อจัดลำดับ หรือใช้ปุ่มขึ้น–ลง
        </p>
      </div>

      {MENU_LOCATIONS.map((location, index) => (
        <MenuEditor
          key={location}
          location={location}
          initial={saved[index] ?? []}
          usingDefault={saved[index] === null}
        />
      ))}
    </div>
  );
}
