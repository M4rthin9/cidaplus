export default function HomePage() {
  return (
    <main id="content" className="mx-auto max-w-[var(--container-site)] px-4 py-16 md:px-6">
      <p className="text-sm text-(--color-text-muted)">กรมราชทัณฑ์ กระทรวงยุติธรรม</p>

      <h1 className="mt-2 text-3xl font-semibold md:text-4xl">ทัณฑสถานบำบัดพิเศษกลาง</h1>

      <div
        className="mt-5 h-0.5 w-16 rounded-full"
        style={{ backgroundColor: "var(--color-seal-gold)" }}
        aria-hidden="true"
      />

      <p className="mt-6 max-w-prose">
        โครงร่างเว็บไซต์พร้อมใช้งานแล้ว ขั้นตอนถัดไปคือฐานข้อมูลและเนื้อหา
      </p>

      <p className="mt-8">
        <span className="inline-block rounded-(--radius-control) bg-(--color-brand-tint) px-3 py-2.5 text-sm text-(--color-brand)">
          ระยะที่ 0 — โครงสร้างโปรเจกต์
        </span>
      </p>
    </main>
  );
}
