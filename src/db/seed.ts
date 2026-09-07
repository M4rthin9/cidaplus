/**
 * Seed data. SPEC.md §7.
 *
 * Thai only, on purpose. The `en` and `zh-Hans` rows are left empty rather than
 * machine-translated: the fallback path must be exercised from day one, and a
 * wrong English name is worse than a visible gap. Do not add English or Chinese
 * copy here without a human translator (SPEC.md §14).
 *
 * Idempotent. Every row is flagged `is_seed`, and the script hard-deletes those
 * rows before inserting, so `pnpm db:seed` twice in a row leaves the same state.
 */
import { eq } from "drizzle-orm";
import { db, sql } from "./client";
import {
  categories,
  categoryI18n,
  locales,
  postI18n,
  posts,
  productI18n,
  productSpecI18n,
  productSpecs,
  products,
} from "./schema";

const TH = "th";

const LOCALES = [
  { code: "th", labelNative: "ไทย", isDefault: true, isEnabled: true, sortOrder: 0 },
  // Present so the schema and fallback are real, disabled until a translator is
  // assigned (SPEC.md §14 decision 9).
  { code: "en", labelNative: "English", isDefault: false, isEnabled: false, sortOrder: 1 },
  { code: "zh-Hans", labelNative: "简体中文", isDefault: false, isEnabled: false, sortOrder: 2 },
];

/** SPEC.md §7 — this order and these slugs are specified, not chosen. */
const CATEGORIES = [
  {
    slug: "puangreed-baengpan",
    name: "พวงหรีดแบ่งปัน",
    description: "พวงหรีดที่ผลิตด้วยความประณีต เพื่อร่วมแสดงความอาลัยอย่างสมเกียรติ",
    products: [
      "พวงหรีดดอกไม้ประดิษฐ์ ทรงกลม",
      "พวงหรีดดอกไม้ประดิษฐ์ ทรงหยดน้ำ",
      "พวงหรีดผ้าไตร พร้อมชุดสังฆทาน",
      "พวงหรีดพัดลม ขนาด ๑๖ นิ้ว",
      "พวงหรีดดอกไม้สด ทรงมาตรฐาน",
    ],
  },
  {
    slug: "artificial-flowers",
    name: "ดอกไม้ประดิษฐ์",
    description: "ดอกไม้ประดิษฐ์จากผ้าและกระดาษสา ทำด้วยมือทีละชิ้น",
    products: [
      "ช่อดอกกุหลาบผ้าใยบัว",
      "แจกันดอกไม้ประดิษฐ์ ขนาดกลาง",
      "พานพุ่มดอกไม้ประดิษฐ์",
      "กระเช้าดอกไม้ประดิษฐ์ สำหรับมอบเป็นของขวัญ",
    ],
  },
  {
    slug: "fiberglass",
    name: "ผลิตภัณฑ์ไฟเบอร์กลาส",
    description: "งานหล่อไฟเบอร์กลาส แข็งแรง ทนแดดทนฝน เหมาะกับงานกลางแจ้ง",
    products: [
      "กระถางต้นไม้ไฟเบอร์กลาส ทรงสูง",
      "ม้านั่งสนามไฟเบอร์กลาส",
      "ถังขยะไฟเบอร์กลาส พร้อมฝา",
      "อ่างบัวไฟเบอร์กลาส ลายไทย",
      "ป้ายชื่อหน่วยงานไฟเบอร์กลาส",
      "ชุดโต๊ะสนามไฟเบอร์กลาส",
    ],
  },
  {
    slug: "needlework",
    name: "เย็บปักถักร้อย",
    description: "งานเย็บ ปัก ถัก และร้อย ฝีมือประณีตจากผู้เข้ารับการบำบัด",
    products: [
      "กระเป๋าผ้าฝ้ายปักลายดอกไม้",
      "ผ้าคลุมไหล่ถักโครเชต์",
      "หมอนอิงปักลายไทย",
      "ผ้าปูโต๊ะปักมือ ขนาด ๑๕๐ ซม.",
      "กระเป๋าสตางค์ผ้าไหมสังเคราะห์",
    ],
  },
];

const SPECS = [
  { label: "ขนาด", value: "ตามแบบมาตรฐาน" },
  { label: "วัสดุ", value: "ตามรายละเอียดสินค้า" },
  { label: "ระยะเวลาผลิต", value: "๓–๕ วันทำการ" },
];

const POSTS = [
  {
    type: "news" as const,
    slug: "khai-phalittaphan-2568",
    title: "เปิดจำหน่ายผลิตภัณฑ์ฝีมือผู้เข้ารับการบำบัด ประจำปี ๒๕๖๘",
    excerpt: "ผลิตภัณฑ์จากโครงการฝึกวิชาชีพ พร้อมจำหน่ายแล้ววันนี้ สอบถามรายละเอียดทาง LINE",
  },
  {
    type: "news" as const,
    slug: "aphrom-wichachip-fiberglass",
    title: "อบรมวิชาชีพงานไฟเบอร์กลาส รุ่นที่ ๗",
    excerpt: "โครงการฝึกอบรมวิชาชีพเพื่อการมีงานทำภายหลังพ้นโทษ",
  },
  {
    type: "event" as const,
    slug: "ngan-sadaeng-sinkha-2568",
    title: "งานแสดงและจำหน่ายสินค้าผลิตภัณฑ์ราชทัณฑ์",
    excerpt: "ขอเชิญร่วมชมและเลือกซื้อผลิตภัณฑ์ฝีมือผู้เข้ารับการบำบัด",
    eventStartAt: "2026-11-14T02:00:00Z",
    eventEndAt: "2026-11-16T10:00:00Z",
    eventLocation: "ลานอเนกประสงค์ ทัณฑสถานบำบัดพิเศษกลาง",
  },
];

/** Deterministic Thai body copy. Not lorem ipsum — Latin filler hides Thai layout bugs. */
function bodyDoc(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

async function main() {
  const startedAt = Date.now();

  await db.transaction(async (tx) => {
    // --- locales -----------------------------------------------------------
    // Not seed-flagged: these are configuration, not sample content, and the
    // purge button must never remove the site's languages.
    for (const locale of LOCALES) {
      await tx
        .insert(locales)
        .values(locale)
        .onConflictDoUpdate({ target: locales.code, set: locale });
    }

    // --- purge previous seed content ---------------------------------------
    // Children first; the i18n rows cascade, the parents do not.
    await tx.delete(posts).where(eq(posts.isSeed, true));
    await tx.delete(products).where(eq(products.isSeed, true));
    await tx.delete(categories).where(eq(categories.isSeed, true));

    // --- categories and products -------------------------------------------
    let categoryIndex = 0;
    for (const category of CATEGORIES) {
      const [inserted] = await tx
        .insert(categories)
        .values({ sortOrder: categoryIndex, isPublished: true, isSeed: true })
        .returning({ id: categories.id });
      if (!inserted) throw new Error(`failed to insert category ${category.slug}`);

      await tx.insert(categoryI18n).values({
        categoryId: inserted.id,
        locale: TH,
        slug: category.slug,
        name: category.name,
        description: category.description,
      });

      let productIndex = 0;
      for (const name of category.products) {
        const [product] = await tx
          .insert(products)
          .values({
            categoryId: inserted.id,
            // A spread of price states so every card variant is reviewable,
            // including สอบถามราคา (docs/DESIGN.md).
            price: productIndex % 4 === 3 ? null : String((productIndex + 2) * 250),
            priceDisplay: productIndex % 4 === 3 ? "contact" : "exact",
            sortOrder: productIndex,
            isFeatured: productIndex === 0,
            isPublished: true,
            publishedAt: new Date("2026-01-15T00:00:00Z"),
            isSeed: true,
          })
          .returning({ id: products.id });
        if (!product) throw new Error(`failed to insert product ${name}`);

        await tx.insert(productI18n).values({
          productId: product.id,
          locale: TH,
          slug: `${category.slug}-${productIndex + 1}`,
          name,
          shortDesc: `${name} ผลิตโดยผู้เข้ารับการบำบัด ภายใต้โครงการฝึกวิชาชีพ`,
          body: bodyDoc(
            `${name} เป็นผลิตภัณฑ์จากโครงการฝึกวิชาชีพของทัณฑสถานบำบัดพิเศษกลาง ` +
              `ผลิตด้วยความประณีตทีละชิ้น สอบถามรายละเอียดเพิ่มเติมได้ทาง LINE`,
          ),
        });

        let specIndex = 0;
        for (const spec of SPECS) {
          const [row] = await tx
            .insert(productSpecs)
            .values({ productId: product.id, sortOrder: specIndex })
            .returning({ id: productSpecs.id });
          if (!row) throw new Error("failed to insert product spec");
          await tx
            .insert(productSpecI18n)
            .values({ specId: row.id, locale: TH, label: spec.label, value: spec.value });
          specIndex += 1;
        }

        productIndex += 1;
      }

      categoryIndex += 1;
    }

    // --- posts --------------------------------------------------------------
    for (const post of POSTS) {
      const [inserted] = await tx
        .insert(posts)
        .values({
          type: post.type,
          isPublished: true,
          publishedAt: new Date("2026-02-01T00:00:00Z"),
          eventStartAt: post.eventStartAt ? new Date(post.eventStartAt) : null,
          eventEndAt: post.eventEndAt ? new Date(post.eventEndAt) : null,
          eventLocation: post.eventLocation ?? null,
          isSeed: true,
        })
        .returning({ id: posts.id });
      if (!inserted) throw new Error(`failed to insert post ${post.slug}`);

      await tx.insert(postI18n).values({
        postId: inserted.id,
        locale: TH,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: bodyDoc(post.excerpt),
      });
    }
  });

  // Raw client: a plain aggregate is clearer than composing it through the ORM.
  const counts = await sql<{ table: string; n: number }[]>`
      select 'locales'       as "table", count(*)::int as n from locales
      union all select 'categories',     count(*)::int from categories     where is_seed
      union all select 'category_i18n',  count(*)::int from category_i18n
      union all select 'products',       count(*)::int from products       where is_seed
      union all select 'product_i18n',   count(*)::int from product_i18n
      union all select 'product_specs',  count(*)::int from product_specs
      union all select 'posts',          count(*)::int from posts          where is_seed
      union all select 'post_i18n',      count(*)::int from post_i18n
      order by 1
    `;

  console.warn(`seed complete in ${Date.now() - startedAt}ms`);
  console.table(counts.map((r) => ({ table: r.table, rows: r.n })));
}

main()
  .then(async () => {
    await sql.end();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error("seed failed:", error);
    await sql.end();
    process.exit(1);
  });
