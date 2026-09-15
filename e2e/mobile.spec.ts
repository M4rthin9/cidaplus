import { expect, test } from "@playwright/test";
import { must } from "./helpers";

/** 360px is the width CLAUDE.md requires every layout to survive. */
test("the mobile menu opens and navigates", async ({ page }) => {
  await page.goto("/");

  const toggle = page.getByRole("button", { name: /เปิดเมนู|เมนู/ }).first();
  await expect(toggle).toBeVisible();
  await toggle.click();

  const products = page.getByRole("link", { name: "สินค้า", exact: true }).first();
  await expect(products).toBeVisible();
  await products.click();
  await expect(page).toHaveURL(/\/products/);
});

test("nothing overflows horizontally at 360px", async ({ page }) => {
  for (const path of ["/", "/products", "/events", "/news", "/contact"]) {
    await page.goto(path);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows, `${path} scrolls sideways at 360px`).toBe(false);
  }
});

test("the product page's sticky LINE bar cannot cover the footer", async ({ page }) => {
  await page.goto("/product/fiberglass-3");

  /**
   * Assert the mechanism, not a scroll-position snapshot.
   *
   * `main` clears the bar with its own pb-24, but the footer is a *sibling* of
   * `main`, so at the bottom of the document the fixed bar sat on top of the
   * footer's own LINE button. globals.css pads the footer via
   * `body:has(.product-cta-bar)`. Measuring that padding against the bar's real
   * height is deterministic; measuring the gap after scrolling depends on the
   * viewport height and on when the scroll settles, which is how this test
   * first failed for a reason that had nothing to do with the layout.
   */
  const measured = await page.evaluate(() => {
    const bar = document.querySelector(".product-cta-bar");
    const footer = document.querySelector("footer");
    if (!bar || !footer) return null;
    return {
      barHeight: bar.getBoundingClientRect().height,
      footerPaddingBottom: parseFloat(getComputedStyle(footer).paddingBottom),
      barIsFixed: getComputedStyle(bar).position === "fixed",
    };
  });

  const { barHeight, footerPaddingBottom, barIsFixed } = must(
    measured,
    "the sticky bar and the footer to both be present at 360px",
  );

  expect(barIsFixed, "the bar is the fixed mobile CTA").toBe(true);
  expect(barHeight).toBeGreaterThan(0);
  expect(
    footerPaddingBottom,
    "the footer must reserve at least the bar's height so its own LINE button stays reachable",
  ).toBeGreaterThanOrEqual(barHeight);
});
