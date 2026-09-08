import { describe, expect, it } from "vitest";
import {
  addFriendUrl,
  goLinePath,
  normaliseOaId,
  oaMessageUrl,
  renderMessageTemplate,
} from "./line";

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

describe("oaMessageUrl", () => {
  it("uses LINE's oaMessage form so the chat opens with the text already typed", () => {
    expect(oaMessageUrl("@355kxfoj", "สวัสดี")).toBe(
      "https://line.me/R/oaMessage/%40355kxfoj/?%E0%B8%AA%E0%B8%A7%E0%B8%B1%E0%B8%AA%E0%B8%94%E0%B8%B5",
    );
  });

  it("encodes a message containing the characters that would otherwise break the query", () => {
    const url = oaMessageUrl("@x", "a&b?c #d");
    expect(url.endsWith("/?a%26b%3Fc%20%23d")).toBe(true);
  });

  it("normalises a handle written without the @", () => {
    expect(oaMessageUrl("x", "hi")).toBe(oaMessageUrl("@x", "hi"));
  });
});

describe("renderMessageTemplate", () => {
  const vars = { product_name: "พวงหรีดทรงกลม", product_url: "https://cidapt.com/product/a" };

  it("fills the placeholders SPEC.md §8 defines", () => {
    expect(renderMessageTemplate("สนใจสอบถามสินค้า: {product_name} ({product_url})", vars)).toBe(
      "สนใจสอบถามสินค้า: พวงหรีดทรงกลม (https://cidapt.com/product/a)",
    );
  });

  it("leaves an unknown placeholder visible instead of blanking it", () => {
    // An operator who typo'd {product_nme} should see the typo in the chat and
    // fix it, not send a message with a silent hole in it.
    expect(renderMessageTemplate("ถาม {product_nme}", vars)).toBe("ถาม {product_nme}");
  });

  it("fills a placeholder used more than once", () => {
    expect(renderMessageTemplate("{product_name} / {product_name}", vars)).toBe(
      "พวงหรีดทรงกลม / พวงหรีดทรงกลม",
    );
  });

  it("returns a template with no placeholders unchanged", () => {
    expect(renderMessageTemplate("สอบถามสินค้า", vars)).toBe("สอบถามสินค้า");
  });
});

describe("goLinePath", () => {
  it("carries the product slug so the redirect can resolve the message", () => {
    expect(goLinePath("puangreed-1")).toBe("/go/line?p=puangreed-1");
  });

  it("percent-encodes a Thai slug", () => {
    // Slugs are Thai UTF-8 (§14 decision 17), so this is the normal case.
    expect(goLinePath("พวงหรีด")).toBe(
      "/go/line?p=%E0%B8%9E%E0%B8%A7%E0%B8%87%E0%B8%AB%E0%B8%A3%E0%B8%B5%E0%B8%94",
    );
  });

  it("omits the parameter entirely when there is no product", () => {
    // The header, footer, contact page and category band: still tracked, but
    // there is nothing to pre-fill a message about.
    expect(goLinePath()).toBe("/go/line");
  });
});
