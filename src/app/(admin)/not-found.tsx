import Link from "next/link";

/**
 * The root 404, for paths the locale middleware never rewrote — `/admin` typos
 * and anything outside the public tree. Deliberately free of the storefront
 * chrome and of `next-intl` hooks: it renders outside a locale scope, so there
 * is no request locale to read.
 */
export default function RootNotFound() {
  return (
    <main id="content" className="mx-auto max-w-(--container-site) px-4 py-24 md:px-6">
      <p className="lat text-sm text-(--color-text-muted)">404</p>
      <h1 className="mt-2 text-3xl font-semibold">ไม่พบหน้าที่ท่านต้องการ</h1>
      <div className="mt-4 h-0.5 w-12 rounded-full bg-(--color-brand)" aria-hidden="true" />
      <p className="mt-6 max-w-prose text-(--color-text)">หน้าที่ท่านเปิดอาจถูกย้ายหรือลบไปแล้ว</p>
      <p className="mt-8">
        <Link
          href="/"
          className="rounded-(--radius-control) bg-(--color-brand) px-5 py-2.5 text-sm font-medium text-white hover:bg-(--color-brand-hover)"
        >
          กลับไปหน้าแรก
        </Link>
      </p>
    </main>
  );
}
