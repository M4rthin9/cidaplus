import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { SETTINGS, SETTING_KEYS } from "@/lib/settings/registry";

export const metadata = { title: "ตั้งค่า" };

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">ตั้งค่า</h1>

      <nav
        aria-label="หมวดการตั้งค่า"
        className="flex flex-wrap gap-2 border-b border-(--color-border) pb-3 text-sm"
      >
        {SETTING_KEYS.map((key) => (
          <Link
            key={key}
            href={`/admin/settings/${key}`}
            className="rounded-(--radius-control) px-3 py-1.5 text-(--color-text) hover:bg-(--color-surface) hover:text-(--color-brand)"
          >
            {SETTINGS[key].label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
