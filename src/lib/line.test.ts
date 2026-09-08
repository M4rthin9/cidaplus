import { describe, expect, it } from "vitest";
import { addFriendUrl, normaliseOaId } from "./line";

describe("normaliseOaId", () => {
  it("adds the leading @ when the operator omits it", () => {
    expect(normaliseOaId("355kxfoj")).toBe("@355kxfoj");
  });

  it("leaves an already-prefixed handle alone", () => {
    expect(normaliseOaId("@355kxfoj")).toBe("@355kxfoj");
  });

  it("trims surrounding whitespace, which a paste normally carries", () => {
    expect(normaliseOaId("  @355kxfoj \n")).toBe("@355kxfoj");
  });
});

describe("addFriendUrl", () => {
  it("matches the form SPEC.md §8 publishes", () => {
    expect(addFriendUrl("@355kxfoj")).toBe("https://line.me/ti/p/%40355kxfoj");
  });

  it("encodes the @, since LINE's own published link does", () => {
    expect(addFriendUrl("355kxfoj")).toContain("%40");
    expect(addFriendUrl("355kxfoj")).not.toContain("/@");
  });
});
