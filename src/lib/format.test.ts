import { describe, expect, it } from "vitest";
import { formatPrice } from "./format";

describe("formatPrice", () => {
  it("groups thousands the way docs/DESIGN.md specifies", () => {
    expect(formatPrice("2500.00")).toBe("2,500");
  });

  it("keeps satang when they are not zero", () => {
    expect(formatPrice("1250.50")).toBe("1,250.5");
  });

  it("returns null for a null price rather than 0", () => {
    // price is null whenever price_display is contact or hidden; rendering "0"
    // would be a public claim about the price of a funeral wreath.
    expect(formatPrice(null)).toBeNull();
  });

  it("returns null rather than NaN for a non-numeric column value", () => {
    expect(formatPrice("not a number")).toBeNull();
  });
});
