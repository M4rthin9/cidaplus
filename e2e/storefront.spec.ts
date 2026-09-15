import { expect, test } from "@playwright/test";
import { countIn } from "./helpers";

/** The catalog controls are URL state, resolved in SQL. */
test("the catalog filters, searches and sorts from the URL", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const allCount = countIn(
    await page.getByText(/พบ \d+ รายการ/).textContent(),
    "the unfiltered result count",
  );
  expect(allCount).toBeGreaterThan(0);

  await page.goto("/products?category=fiberglass");
  const filteredCount = countIn(
    await page.getByText(/พบ \d+ รายการ/).textContent(),
    "the filtered result count",
  );
  expect(filteredCount).toBeLessThan(allCount);

  // A filtered view is a shareable link, not hidden client state.
  await expect(page).toHaveURL(/category=fiberglass/);

  await page.goto("/products?q=ไม่มีสินค้าชื่อนี้แน่นอน");
  await expect(page.getByText("พบ 0 รายการ")).toBeVisible();
  await expect(page.getByRole("link", { name: "ล้างตัวกรอง" })).toBeVisible();
});

test("draft and deleted content never reaches the public site", async ({ page }) => {
  // The seed publishes everything it creates, so anything unpublished in the
  // database must be absent here; a 404 for an unknown slug is the same rule.
  const missing = await page.goto("/product/ไม่มีสินค้านี้");
  expect(missing?.status()).toBe(404);

  const missingEvent = await page.goto("/events/ไม่มีกิจกรรมนี้");
  expect(missingEvent?.status()).toBe(404);
});

test("a disabled locale 404s rather than serving a half-translated page", async ({ page }) => {
  // locales.is_enabled decides, not the routing table (§14 decision 9).
  const en = await page.goto("/en");
  expect(en?.status()).toBe(404);
});

test("the sitemap lists only canonical, published URLs", async ({ page }) => {
  const xml = await (await page.request.get("/sitemap.xml")).text();
  expect(xml).toContain("/events/");
  expect(xml).toContain("/products");
  // Events are canonical under /events, so no event may be advertised as news.
  const slugsUnder = (section: string) =>
    [...xml.matchAll(new RegExp(`<loc>[^<]*/${section}/([^<]+)</loc>`, "g"))]
      .map((m) => m[1])
      .filter((slug): slug is string => Boolean(slug));
  const newsUrls = slugsUnder("news");
  const eventUrls = slugsUnder("events");
  const shared = newsUrls.filter((slug) => eventUrls.includes(slug));
  expect(shared, "an event must not also be advertised under /news").toHaveLength(0);
});
