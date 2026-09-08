import { describe, expect, it } from "vitest";
import { defaultsFor } from "./registry";
import { contrastChecks, contrastRatio, themeStyle } from "./theme";

const theme = defaultsFor("theme");

describe("themeStyle", () => {
  it("maps every registry field to a CSS custom property", () => {
    const style = themeStyle(theme);
    expect(Object.keys(style)).toHaveLength(Object.keys(theme).length);
    expect(Object.keys(style).every((k) => k.startsWith("--"))).toBe(true);
  });

  it("emits the colours Tailwind's utilities resolve through", () => {
    const style = themeStyle(theme);
    expect(style["--color-brand"]).toBe("#880924");
    expect(style["--color-accent"]).toBe("#0b7a3f");
    expect(style["--color-seal-gold"]).toBe("#edd357");
  });

  it("adds px to the numeric fields, and only those", () => {
    const style = themeStyle(theme);
    expect(style["--radius-card"]).toBe("8px");
    expect(style["--container-site"]).toBe("1200px");
    expect(style["--color-bg"]).toBe("#ffffff");
  });

  it("reflects an overridden colour, which is what 'no rebuild' rests on", () => {
    expect(themeStyle({ ...theme, colorAccent: "#123456" })["--color-accent"]).toBe("#123456");
  });
});

describe("contrastRatio", () => {
  it("is 21:1 for black on white and 1:1 for a colour on itself", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#880924", "#880924")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#880924", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#880924"), 9);
  });

  it("matches the measured values recorded in docs/DESIGN.md", () => {
    expect(contrastRatio("#880924", "#ffffff")).toBeCloseTo(9.9, 1);
    expect(contrastRatio("#241c1e", "#ffffff")).toBeCloseTo(16.7, 1);
  });
});

describe("contrastChecks", () => {
  it("passes on the shipped palette — it was chosen to clear AA", () => {
    const failures = contrastChecks(theme).filter((c) => !c.passes);
    expect(failures.map((f) => `${f.label} ${f.ratio.toFixed(2)}`)).toEqual([]);
  });

  it("catches the exact regression DESIGN.md warns about", () => {
    // #17A66B was the pre-seal accent: 3.13:1 with white, failing AA on the
    // site's primary call to action.
    const bad = contrastChecks({ ...theme, colorAccent: "#17a66b" });
    const line = bad.find((c) => c.label === "ตัวอักษรขาวบนปุ่ม LINE");
    expect(line?.passes).toBe(false);
    expect(line?.ratio).toBeCloseTo(3.13, 2);
  });

  it("catches unreadable body text", () => {
    const bad = contrastChecks({ ...theme, colorText: "#dddddd" });
    expect(bad.find((c) => c.label === "ข้อความเนื้อหาบนพื้นหลัง")?.passes).toBe(false);
  });
});
