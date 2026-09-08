/**
 * Value formatting shared by the storefront.
 *
 * Prices are Thai baht written `2,500 บาท` (docs/DESIGN.md), not `฿2,500` — the
 * design specifies the word, and `฿` before a Thai numeral group reads as a
 * foreign convention on an institutional site.
 */

const baht = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * `products.price` is `numeric`, which the driver returns as a string so the
 * value cannot drift through a float. Parse only for display.
 */
export function formatPrice(value: string | null): string | null {
  if (value === null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return baht.format(n);
}
