import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { getAdminUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth";
import { LOGIN_PATH } from "@/lib/auth/config";
import { Button } from "@/components/ui/field";
import { unreadMessageCount } from "@/lib/admin/messages";

export const metadata: Metadata = {
  title: { default: "ระบบจัดการเว็บไซต์", template: "%s — ระบบจัดการเว็บไซต์" },
  robots: { index: false, follow: false },
};

/** Every admin label is Thai (CLAUDE.md). Sections not yet built are not listed. */
type NavItem = { href: string; label: string; ownerOnly?: boolean; badge?: number };

const NAV: readonly NavItem[] = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/categories", label: "หมวดหมู่" },
  { href: "/admin/products", label: "สินค้า" },
  { href: "/admin/posts", label: "ข่าวและกิจกรรม" },
  { href: "/admin/media", label: "คลังภาพ" },
  { href: "/admin/messages", label: "กล่องข้อความ" },
  { href: "/admin/users", label: "ผู้ดูแลระบบ", ownerOnly: true },
  { href: "/admin/settings/general", label: "ตั้งค่า" },
  { href: "/admin/audit", label: "ประวัติการแก้ไข" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The login page nests under /admin but must render without a session.
  const pathname = (await headers()).get("x-pathname") ?? "";
  const user = await getAdminUser();

  if (!user) {
    return <>{children}</>;
  }

  const unread = await unreadMessageCount();
  const items = NAV.filter((item) => !item.ownerOnly || user.role === "owner").map((item) =>
    item.href === "/admin/messages" && unread > 0 ? { ...item, badge: unread } : item,
  );

  return (
    <div className="min-h-screen bg-(--color-surface)">
      <header className="border-b border-(--color-border) bg-(--color-bg)">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/admin" className="text-sm font-semibold text-(--color-heading)">
            ทัณฑสถานบำบัดพิเศษกลาง
          </Link>

          <nav aria-label="เมนูหลัก" className="flex flex-wrap gap-x-5 gap-y-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="text-sm text-(--color-text) hover:text-(--color-brand)"
              >
                {item.label}
                {item.badge !== undefined && (
                  <span className="ms-1.5 rounded-full bg-(--color-brand) px-1.5 py-0.5 text-xs text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-3">
            <span className="text-sm text-(--color-text-muted)">
              {user.name}
              <span className="ms-2 rounded-(--radius-control) bg-(--color-surface) px-2 py-0.5 text-xs">
                {user.role === "owner" ? "ผู้ดูแลสูงสุด" : "ผู้แก้ไข"}
              </span>
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: LOGIN_PATH });
              }}
            >
              <Button variant="secondary" type="submit">
                ออกจากระบบ
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
