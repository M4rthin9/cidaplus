import { expect, test } from "@playwright/test";
import {
  expectNotOnPage,
  expectOnPage,
  must,
  expectSaved,
  saveButton,
  signIn,
  stamp,
} from "./helpers";

/**
 * SPEC §12 / CLAUDE.md: create → publish → public; edit → public updates;
 * delete → public disappears; restore → it comes back.
 *
 * Each assertion hits the public page immediately after the write, so this
 * covers the revalidation wiring as much as the CRUD: before
 * src/lib/cache/revalidate.ts existed, the storefront kept serving the previous
 * render for up to 60 seconds and every step below would have failed.
 */
test.describe.configure({ mode: "serial" });

const id = stamp();
const NAME = `สินค้าทดสอบ ${id}`;
const RENAMED = `${NAME} แก้ไขแล้ว`;
const SKU = `E2E-${id.toUpperCase()}`;
/** An ASCII slug the teardown can find; see e2e/global-teardown.ts. */
const SLUG = `e2e-product-${id}`;

let slug = "";

test("an admin can create and publish a product, and it appears publicly", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products/new");

  await page.fill('input[name="name"]', NAME);
  await page.fill('input[name="slug"]', SLUG);
  await page.fill('input[name="sku"]', SKU);
  await page.fill('input[name="price"]', "1234");
  await page.selectOption('select[name="publishState"]', "published");
  await saveButton(page, "name").click();

  await page.waitForURL(/\/admin\/products\/[0-9a-f-]+/);
  expect(page.url()).not.toContain("/new");

  /**
   * Newest-first, not the default order: `products.sort_order` is ordered
   * *within a category* (CLAUDE.md, phase 4), so a new product lands wherever
   * its category's numbering puts it — page 2 here — rather than at the front.
   * Sorting by newest is both deterministic and a real user-facing path.
   */
  await expectOnPage(page, "/products?sort=newest", NAME);

  const href = must(
    await page.getByRole("link", { name: NAME }).first().getAttribute("href"),
    "an href on the product card",
  );
  expect(href).toContain(`/product/${SLUG}`);
  slug = SLUG;

  await page.goto(`/product/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name: NAME })).toBeVisible();
  await expect(page.getByText(SKU)).toBeVisible();
});

test("the product is searchable by its SKU", async ({ page }) => {
  // Free text matches the localised name via EXISTS and the SKU on the product
  // row; this is the half a name search would not reach.
  await page.goto(`/products?q=${encodeURIComponent(SKU)}`);
  await expect(page.getByText(NAME).first()).toBeVisible();
  await expect(page.getByText("พบ 1 รายการ")).toBeVisible();
});

test("its LINE handoff carries the product name and code", async ({ page }) => {
  const response = await page.request.get(`/go/line?p=${encodeURIComponent(slug)}`, {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(302);

  const target = must(response.headers()["location"], "a Location header on the LINE redirect");
  expect(target).toContain("line.me/R/oaMessage/");

  const message = decodeURIComponent(
    must(target.split("/?")[1], "a pre-filled message in the LINE URL"),
  );
  expect(message).toContain(NAME);
  expect(message).toContain(SKU);
  // The account is never written at a call site — it comes from settings.line.
  expect(target).toContain("%40");
});

test("an edit shows up publicly", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products");
  await page.getByRole("link", { name: NAME }).first().click();
  await page.waitForURL(/\/admin\/products\/[0-9a-f-]+/);

  await page.fill('input[name="name"]', RENAMED);
  await saveButton(page, "name").click();
  await expectSaved(page);

  await expectOnPage(page, `/product/${slug}`, RENAMED);
});

test("deleting hides it from the public site, and restoring brings it back", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products");

  // Delete is a bulk action: tick the row, then press ลบ.
  const row = page.locator("tr", { hasText: RENAMED }).first();
  await row.locator('input[type="checkbox"]').check();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "ลบ", exact: true }).click();
  await expect(page.locator("tr", { hasText: RENAMED })).toHaveCount(0);

  // Gone from the catalog and 404 at its own URL — not merely hidden from one list.
  await expectNotOnPage(page, "/products?sort=newest", RENAMED);
  const gone = await page.goto(`/product/${slug}`);
  expect(gone?.status()).toBe(404);

  // Soft delete means recoverable: SPEC §7's promise, via /admin/trash.
  await page.goto("/admin/trash");
  await expect(page.getByText(RENAMED)).toBeVisible();
  await page.getByRole("button", { name: `กู้คืน ${RENAMED}` }).click();
  await expect(page.getByText(RENAMED)).toHaveCount(0);

  // Restored as a draft, deliberately — it must not silently republish.
  await page.goto("/admin/products");
  await expect(page.locator("tr", { hasText: RENAMED })).toHaveCount(1);
  const stillGone = await page.goto(`/product/${slug}`);
  expect(stillGone?.status()).toBe(404);
});
